import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const sb = createClient(URL, SERVICE);

    // Get all tenants
    const { data: tenants } = await sb.from("Unternehmen").select("id");
    const tenantIds = (tenants ?? []).map((t) => t.id);

    let created = 0;

    for (const tenant_id of tenantIds) {
      // Fetch top-5 failure drivers (30d)
      const { data: top } = await sb
        .from("v_root_cause_top" as any)
        .select("*")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (!top?.top_fails || top.top_fails.length === 0) {
        console.log(`[root-cause] No factors for tenant ${tenant_id}`);
        continue;
      }

      // Store as feature attribution (30d)
      const { error: attrError } = await sb
        .from("feature_attribution")
        .insert({
          tenant_id,
          time_window: "30d",
          factors: top.top_fails,
        });

      if (attrError) {
        console.error(
          `[root-cause] Error storing attribution for ${tenant_id}:`,
          attrError
        );
        continue;
      }

      console.log(`[root-cause] Created attribution for tenant ${tenant_id}`, {
        factors_count: top.top_fails.length,
      });

      created++;
    }

    return new Response(
      JSON.stringify({ ok: true, insights_created: created }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[generate-root-cause] error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
