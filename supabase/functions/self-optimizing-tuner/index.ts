// supabase/functions/self-optimizing-tuner/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

    const tuned = [];

    for (const t of tenants ?? []) {
      const tenantId = t.tenant_id;
      
      // Fetch last reliability + MAE from forecast evaluation metrics
      const { data: metrics } = await sb
        .from("v_forecast_model_metrics_latest")
        .select("reliability, mae_sr")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const reliability = metrics?.reliability ?? 80;
      const mae = metrics?.mae_sr ?? 2;

      // Fetch current weights (if any previous tuning exists)
      const { data: current } = await sb
        .from("v_ensemble_weight_latest")
        .select("weight_arima, weight_gradient, weight_bayes")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      let w_arima = current?.weight_arima ?? 0.33;
      let w_gradient = current?.weight_gradient ?? 0.33;
      let w_bayes = current?.weight_bayes ?? 0.34;

      // Adaptive learning: reward precision (high reliability), penalize volatility (high MAE)
      const learningRate = 0.05;
      
      // Normalize reliability around 75 (target baseline)
      const delta = (reliability - 75) / 100;

      // Adjust ARIMA weight (trend-based) based on reliability
      w_arima = Math.min(0.6, Math.max(0.2, w_arima + delta * learningRate));
      
      // Gradient model gets inverse adjustment (more conservative when reliability drops)
      w_gradient = Math.min(0.6, Math.max(0.2, w_gradient - delta * learningRate * 0.5));
      
      // Bayesian picks up the remainder
      w_bayes = 1 - (w_arima + w_gradient);

      // MAE penalty: if error is high, shift more weight to gradient (more stable)
      if (mae > 3) {
        const maeShift = Math.min(0.1, (mae - 3) * 0.02);
        w_arima = Math.max(0.2, w_arima - maeShift);
        w_gradient = Math.min(0.6, w_gradient + maeShift);
        w_bayes = 1 - (w_arima + w_gradient);
      }

      // Normalize to ensure sum = 1
      const total = w_arima + w_gradient + w_bayes;
      w_arima = w_arima / total;
      w_gradient = w_gradient / total;
      w_bayes = w_bayes / total;

      // Store new weights
      const { error: insertErr } = await sb.from("ensemble_weight_history").insert({
        tenant_id: tenantId,
        weight_arima: Number(w_arima.toFixed(2)),
        weight_gradient: Number(w_gradient.toFixed(2)),
        weight_bayes: Number(w_bayes.toFixed(2)),
        reliability: Number(reliability.toFixed(2)),
        mae: Number(mae.toFixed(2)),
      });

      if (insertErr) {
        console.error(`[self-tuner] Failed for tenant ${tenantId}:`, insertErr);
        continue;
      }

      tuned.push({
        tenant_id: tenantId,
        reliability,
        mae,
        weights: {
          arima: w_arima.toFixed(2),
          gradient: w_gradient.toFixed(2),
          bayes: w_bayes.toFixed(2)
        }
      });

      console.log("[self-tuner]", {
        tenant: tenantId,
        reliability: reliability.toFixed(1),
        mae: mae.toFixed(2),
        weights: `A:${(w_arima*100).toFixed(0)}% G:${(w_gradient*100).toFixed(0)}% B:${(w_bayes*100).toFixed(0)}%`
      });
    }

    console.log("[self-optimizing-tuner] done", {
      tenants_tuned: tuned.length,
      ts: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        tuned: tuned.length,
        results: tuned 
      }), 
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[self-optimizing-tuner] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }), 
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
