import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLO_MIN = 70.0;
const SLO_MAX = 98.0;
const MAX_ADJUSTMENT = 5.0;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { tenant_id, auto_apply } = await req.json().catch(() => ({}));

    // If tenant_id provided, tune only that tenant; otherwise tune all
    const tenantFilter = tenant_id ? [tenant_id] : null;

    let query = sb
      .from("v_forecast_predictions" as any)
      .select("tenant_id, suggested_slo_target, current_slo_target, risk_level, confidence_score, breach_probability_7d");

    if (tenantFilter) {
      query = query.in("tenant_id", tenantFilter);
    }

    const { data: forecasts, error: fetchErr } = await query;

    if (fetchErr) throw fetchErr;

    const adjustments: any[] = [];

    for (const forecast of forecasts ?? []) {
      const delta = forecast.suggested_slo_target - forecast.current_slo_target;

      // Only adjust if delta is significant and confidence is reasonable
      if (Math.abs(delta) < 0.5 || forecast.confidence_score < 50) {
        console.log(`[adaptive-slo-tuner] Skipping ${forecast.tenant_id}: delta=${delta.toFixed(1)}, confidence=${forecast.confidence_score}`);
        continue;
      }

      // Bound adjustment
      const boundedTarget = Math.max(SLO_MIN, Math.min(SLO_MAX, forecast.suggested_slo_target));
      const actualDelta = boundedTarget - forecast.current_slo_target;

      // Further bound to MAX_ADJUSTMENT
      let finalTarget = forecast.current_slo_target + Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, actualDelta));
      finalTarget = Math.round(finalTarget * 100) / 100;

      // Update tenant_settings
      const { error: updateErr } = await sb
        .from("tenant_settings")
        .update({ slo_target_sr: finalTarget })
        .eq("tenant_id", forecast.tenant_id);

      if (updateErr) {
        console.error(`[adaptive-slo-tuner] Failed to update ${forecast.tenant_id}:`, updateErr);
        continue;
      }

      // Mark forecast as applied
      await sb
        .from("forecast_predictions")
        .update({ applied_at: new Date().toISOString() })
        .eq("tenant_id", forecast.tenant_id)
        .is("applied_at", null)
        .order("generated_at", { ascending: false })
        .limit(1);

      // Audit log
      await sb.from("audit_log").insert({
        tenant_id: forecast.tenant_id,
        actor_id: "00000000-0000-0000-0000-000000000000", // system
        action: "slo.auto_tuned",
        entity: "tenant_settings",
        entity_id: forecast.tenant_id,
        payload: {
          old_target: forecast.current_slo_target,
          new_target: finalTarget,
          delta: (finalTarget - forecast.current_slo_target).toFixed(2),
          risk_level: forecast.risk_level,
          breach_probability: forecast.breach_probability_7d,
          confidence: forecast.confidence_score,
        },
      });

      adjustments.push({
        tenant_id: forecast.tenant_id,
        old_target: forecast.current_slo_target,
        new_target: finalTarget,
        delta: (finalTarget - forecast.current_slo_target).toFixed(2),
      });

      console.log("[adaptive-slo-tuner]", {
        tenant_id: forecast.tenant_id,
        old_target: forecast.current_slo_target,
        new_target: finalTarget,
        delta: (finalTarget - forecast.current_slo_target).toFixed(2),
        risk_level: forecast.risk_level,
        confidence: forecast.confidence_score,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        adjustments_made: adjustments.length,
        adjustments: adjustments,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[adaptive-slo-tuner] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
