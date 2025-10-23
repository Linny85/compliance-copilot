// supabase/functions/evaluate-forecast-accuracy/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Alle Forecasts, deren 7d-Fenster vollständig in der Vergangenheit liegt:
    // generated_at ∈ [now()-14d, now()-7d]
    const { data: forecasts, error: fErr } = await sb
      .from("forecast_predictions")
      .select("id, tenant_id, predicted_sr_7d, current_slo_target, generated_at")
      .gte("generated_at", new Date(Date.now() - 14*24*60*60*1000).toISOString())
      .lt ("generated_at", new Date(Date.now() - 7 *24*60*60*1000).toISOString());

    if (fErr) throw fErr;

    const { data: actuals, error: aErr } = await sb
      .from("v_actual_sr_window")
      .select("forecast_id, tenant_id, actual_sr_7d");

    if (aErr) throw aErr;

    const actualById = new Map<string, number>();
    (actuals ?? []).forEach((r: any) => actualById.set(r.forecast_id, Number(r.actual_sr_7d ?? 0)));

    const rows: any[] = [];
    const perTenant: Record<string, { tp:number, fp:number, fn:number, mae:number[], n:number }> = {};

    for (const fc of (forecasts ?? [])) {
      const actual = actualById.get(fc.id) ?? 0;
      const predicted = Number(fc.predicted_sr_7d ?? 0);
      const target = Number(fc.current_slo_target ?? 80);

      const predictedBreach = predicted < target;
      const actualBreach    = actual    < target;

      rows.push({
        forecast_id: fc.id,
        tenant_id: fc.tenant_id,
        predicted_breach: predictedBreach,
        actual_breach: actualBreach,
        predicted_sr: Math.round(predicted * 100) / 100,
        actual_sr: Math.round(actual * 100) / 100,
        evaluation_date: new Date().toISOString(),
        days_ahead: 7
      });

      const acc = perTenant[fc.tenant_id] ?? { tp:0, fp:0, fn:0, mae:[], n:0 };
      if (predictedBreach && actualBreach) acc.tp++;
      if (predictedBreach && !actualBreach) acc.fp++;
      if (!predictedBreach && actualBreach) acc.fn++;
      acc.mae.push(Math.abs(predicted - actual));
      acc.n++;
      perTenant[fc.tenant_id] = acc;
    }

    if (rows.length > 0) {
      await sb.from("forecast_accuracy").insert(rows);
    }

    // Rolling 30d aggregieren (Precision/Recall/MAE/ Reliability)
    for (const [tenantId, _] of Object.entries(perTenant)) {
      const { data: last30, error: lErr } = await sb
        .from("forecast_accuracy")
        .select("predicted_breach, actual_breach, predicted_sr, actual_sr, evaluation_date")
        .eq("tenant_id", tenantId)
        .gte("evaluation_date", new Date(Date.now() - 30*24*60*60*1000).toISOString());

      if (lErr) continue;

      let tp=0, fp=0, fn=0, absErr:number[]=[];
      (last30 ?? []).forEach((r: any) => {
        const predB = !!r.predicted_breach;
        const actB  = !!r.actual_breach;
        if (predB && actB) tp++;
        if (predB && !actB) fp++;
        if (!predB && actB) fn++;
        const p = Number(r.predicted_sr ?? 0), a = Number(r.actual_sr ?? 0);
        absErr.push(Math.abs(p - a));
      });

      const precision = (tp + fp) > 0 ? (100 * tp / (tp + fp)) : 0;
      const recall    = (tp + fn) > 0 ? (100 * tp / (tp + fn)) : 0;
      const mae       = absErr.length ? (absErr.reduce((s,v)=>s+v,0) / absErr.length) : 0;

      // Reliability einfache Heuristik (gewichtet)
      const reliability = Math.max(0, Math.min(100, 0.5*precision + 0.3*recall + 0.2*Math.max(0, 100 - mae)));

      await sb.from("forecast_model_metrics").insert({
        tenant_id: tenantId,
        precision_predicted: Math.round(precision*100)/100,
        recall_breached:     Math.round(recall*100)/100,
        mae_sr:              Math.round(mae*100)/100,
        reliability:         Math.round(reliability*100)/100,
        sample_size:         (last30 ?? []).length
      });
    }

    console.log("[forecast-eval] done", {
      evaluated: rows.length,
      tenants: Object.keys(perTenant).length,
      ts: new Date().toISOString()
    });

    return new Response(JSON.stringify({ ok: true, evaluated: rows.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[evaluate-forecast-accuracy] error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
