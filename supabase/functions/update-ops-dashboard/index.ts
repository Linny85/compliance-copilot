import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Discover tenants
    const { data: tenants } = await sb
      .from("profiles")
      .select("company_id")
      .not("company_id", "is", null);

    const tenantIds = Array.from(
      new Set((tenants ?? []).map((t) => t.company_id).filter(Boolean))
    );

    // Read live metrics
    const { data: live } = await sb
      .from("v_ops_dashboard_live" as any)
      .select("*")
      .in("tenant_id", tenantIds);

    const rows = (live ?? []).map((r: any) => ({
      tenant_id: r.tenant_id,
      mtta_ms: Math.round(r.mtta_ms ?? 0),
      mttr_ms: Math.round(r.mttr_ms ?? 0),
      open_critical: r.open_critical ?? 0,
      open_warning: r.open_warning ?? 0,
      last_24h_alerts: r.last_24h_alerts ?? 0,
      success_rate_30d: r.success_rate_30d ?? 0,
      wow_delta_30d: r.wow_delta_30d ?? 0,
      mtta_p50_ms: Math.round(r.mtta_p50_ms ?? 0),
      mtta_p90_ms: Math.round(r.mtta_p90_ms ?? 0),
      mttr_p50_ms: Math.round(r.mttr_p50_ms ?? 0),
      mttr_p90_ms: Math.round(r.mttr_p90_ms ?? 0),
      burn_24h_x: r.burn_24h_x ?? 0,
      burn_7d_x: r.burn_7d_x ?? 0,
      burn_status: r.burn_status ?? "healthy",
      traffic_light: r.traffic_light ?? "green",
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await sb
        .from("ops_dashboard")
        .upsert(rows, { onConflict: "tenant_id" });

      if (error) throw error;
    }

    // Structured log
    console.log("[update-ops-dashboard] upserts:", rows.length, {
      ts: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        tenants: tenantIds.length,
        upserts: rows.length,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[update-ops-dashboard] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
