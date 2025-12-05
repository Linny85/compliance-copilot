// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_TOKEN = Deno.env.get("INTERNAL_JOB_SECRET") ?? "";

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
    let tenant_id: string | undefined;
    try {
      ({ tenant_id } = await req.json());
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!tenant_id) {
      return json({ error: "Missing tenant_id" }, 400);
    }

    // Get latest QA result scoped to tenant
    const { data: qa } = await sb
      .from("qa_results")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get notification deliveries from last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: deliveries } = await sb
      .from("notification_deliveries")
      .select("status_code, duration_ms")
      .eq("tenant_id", tenant_id)
      .gte("created_at", since);

    const validDurations = (deliveries || [])
      .map((d) => d.duration_ms)
      .filter((d): d is number => d !== null && d !== undefined);

    const avgLatency =
      validDurations.length > 0
        ? validDurations.reduce((a, d) => a + d, 0) / validDurations.length
        : 0;

    const failed = (deliveries || []).filter((d) => (d.status_code ?? 0) >= 400).length;
    const totalDeliveries = deliveries?.length || 0;

    // Upsert monitor data
    const { error: upsertError } = await sb
      .from("qa_monitor")
      .upsert(
        {
          tenant_id,
          last_run_id: qa?.id ?? null,
          last_run_status: `${qa?.passed ?? 0}/${qa?.total ?? 0}`,
          last_run_at: qa?.started_at ?? new Date().toISOString(),
          avg_latency_ms: Math.round(avgLatency),
          failed_24h: failed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );

    if (upsertError) {
      console.error("[update-qa-monitor] Upsert failed:", upsertError);
      throw upsertError;
    }

    return json({
      ok: true,
      stats: {
        avgLatency: Math.round(avgLatency),
        failed,
        qaStatus: `${qa?.passed ?? 0}/${qa?.total ?? 0}`,
        deliveries: totalDeliveries,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[update-qa-monitor] Error:", e);
    return json({ error: e.message ?? "Internal error" }, 500);
  }
});
