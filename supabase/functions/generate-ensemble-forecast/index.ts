// supabase/functions/generate-ensemble-forecast/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  
  try {
    const sb = createClient(URL, SERVICE);
    
    // Get all unique tenant IDs from tenant_settings
    const { data: tenants, error: tenantErr } = await sb
      .from("tenant_settings")
      .select("tenant_id");
    
    if (tenantErr) throw tenantErr;
    
    const results = [];
    
    for (const t of tenants ?? []) {
      const tenantId = t.tenant_id;
      
      // Get reliability score from Phase 15A.2
      const { data: rel } = await sb
        .from("v_forecast_model_metrics_latest")
        .select("reliability")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const reliability = rel?.reliability ?? 80;

      // Adaptive weight adjustment based on reliability
      // Higher reliability -> more weight to ARIMA (trend-based)
      const w_arima = Math.min(0.5, reliability / 300);
      const w_gradient = 0.4;
      const w_bayes = 1 - (w_arima + w_gradient);

      // Fetch recent success rate data for modeling
      const { data: recent } = await sb
        .from("check_results")
        .select("outcome, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", new Date(Date.now() - 90*24*60*60*1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      const sr = recent?.length 
        ? (100 * recent.filter(r => r.outcome === "pass").length / recent.length)
        : 80;

      // Three base models (simplified heuristics - can be replaced with real ML)
      // ARIMA: trend-based, assumes recent pattern continues
      const model_arima = sr + (Math.random() * 2 - 1); // slight variance around current SR
      
      // Gradient: pessimistic, assumes slight degradation
      const model_gradient = sr - 1 + (Math.random() * 2);
      
      // Bayesian: optimistic with prior belief of improvement
      const model_bayes = sr + 0.5 + (Math.random() * 2);

      // Weighted blend
      const blended =
        model_arima * w_arima +
        model_gradient * w_gradient +
        model_bayes * w_bayes;

      // Confidence interval based on reliability and variance
      const variance = 1.5 + (100 - reliability) * 0.02; // higher when less reliable
      const lower = blended - variance;
      const upper = blended + variance;

      // Insert ensemble forecast
      const { error: insertErr } = await sb.from("forecast_ensemble").insert({
        tenant_id: tenantId,
        model_arima: Number(model_arima.toFixed(2)),
        model_gradient: Number(model_gradient.toFixed(2)),
        model_bayes: Number(model_bayes.toFixed(2)),
        weight_arima: Number(w_arima.toFixed(2)),
        weight_gradient: Number(w_gradient.toFixed(2)),
        weight_bayes: Number(w_bayes.toFixed(2)),
        forecast_sr_90d: Number(blended.toFixed(2)),
        lower_ci: Number(lower.toFixed(2)),
        upper_ci: Number(upper.toFixed(2)),
      });

      if (insertErr) {
        console.error(`[ensemble] Failed for tenant ${tenantId}:`, insertErr);
        continue;
      }

      results.push({
        tenant_id: tenantId,
        forecast_sr_90d: blended.toFixed(2),
        reliability,
        weights: { arima: w_arima.toFixed(2), gradient: w_gradient.toFixed(2), bayes: w_bayes.toFixed(2) }
      });

      console.log("[generate-ensemble-forecast]", {
        tenant_id: tenantId,
        forecast_sr_90d: blended.toFixed(2),
        ci: `[${lower.toFixed(2)}, ${upper.toFixed(2)}]`,
        reliability,
        weights: `ARIMA:${w_arima.toFixed(2)} GBT:${w_gradient.toFixed(2)} BAY:${w_bayes.toFixed(2)}`
      });
    }

    console.log("[generate-ensemble-forecast] done", {
      tenants_processed: results.length,
      ts: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        processed: results.length,
        results 
      }), 
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[generate-ensemble-forecast] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }), 
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
