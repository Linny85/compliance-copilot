// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_TOKEN = Deno.env.get("INTERNAL_JOB_SECRET") ?? "";

// Throttle: max 10 requests per second
const THROTTLE_MS = 100;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const providedSecret = req.headers.get("x-internal-token") ?? "";
  if (!INTERNAL_TOKEN || providedSecret !== INTERNAL_TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }

  const sb = createClient(URL, SERVICE_KEY);

  try {
    console.log("[update-qa-monitor-all] Starting batch update for all tenants");

    // Get all tenants (companies)
    const { data: companies, error: companiesError } = await sb
      .from("profiles")
      .select("company_id")
      .not("company_id", "is", null);

    if (companiesError) throw companiesError;

    const uniqueTenants = [...new Set(companies?.map((c) => c.company_id).filter(Boolean) || [])];
    console.log(`[update-qa-monitor-all] Found ${uniqueTenants.length} unique tenants`);

    const results = {
      total: uniqueTenants.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each tenant with throttling
    for (const tenant_id of uniqueTenants) {
      try {
        const response = await fetch(`${URL}/functions/v1/update-qa-monitor`, {
          method: "POST",
          headers: {
            "x-internal-token": INTERNAL_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tenant_id }),
        });

        if (response.ok) {
          results.success++;
          console.log(`[update-qa-monitor-all] ✓ Updated tenant ${tenant_id}`);
        } else {
          results.failed++;
          const errorText = await response.text();
          results.errors.push(`Tenant ${tenant_id}: ${errorText.substring(0, 100)}`);
          console.error(`[update-qa-monitor-all] ✗ Failed tenant ${tenant_id}:`, errorText);
        }

        // Throttle to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Tenant ${tenant_id}: ${e.message}`);
        console.error(`[update-qa-monitor-all] Exception for tenant ${tenant_id}:`, e);
      }
    }

    console.log("[update-qa-monitor-all] Batch complete:", results);

    return json({
      ok: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[update-qa-monitor-all] Critical error:", e);
    return json({ error: e.message ?? "Internal error" }, 500);
  }
});
