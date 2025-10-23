// Phase 16B: evaluate-experiment - Compare canary vs control & decide rollout/rollback
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_EVAL_DAYS = 3; // Minimum days before evaluation
const MAE_IMPROVEMENT_THRESHOLD = 0.5; // Canary must be 0.5pp better
const RELIABILITY_IMPROVEMENT_THRESHOLD = 5; // Canary must be 5pp better

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(URL, SERVICE);

    // 1) Find running experiments
    const { data: experiments } = await sb
      .from("model_experiments")
      .select("*")
      .eq("status", "running")
      .eq("family", "ensemble");

    if (!experiments?.length) {
      console.log("[evaluate-experiment] no running experiments");
      return new Response(JSON.stringify({ ok: true, evaluated: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    for (const exp of experiments) {
      try {
        // Check if experiment has run long enough
        const startedAt = new Date(exp.started_at);
        const daysSinceStart = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceStart < MIN_EVAL_DAYS) {
          console.log(`[evaluate-experiment] experiment ${exp.id} too young (${daysSinceStart.toFixed(1)} days)`);
          continue;
        }

        // 2) Get canary tenant IDs
        const { data: canaryAssignments } = await sb
          .from("model_experiment_assignments")
          .select("tenant_id")
          .eq("experiment_id", exp.id);

        if (!canaryAssignments?.length) {
          console.log(`[evaluate-experiment] no canary assignments for ${exp.id}`);
          continue;
        }

        const canaryTenantIds = canaryAssignments.map((a) => a.tenant_id);

        // 3) Get performance metrics for canary group (last 3 days)
        const { data: canaryMetrics } = await sb
          .from("forecast_accuracy")
          .select("predicted_sr, actual_sr, evaluation_date, tenant_id")
          .in("tenant_id", canaryTenantIds)
          .gte("evaluation_date", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

        // 4) Get performance metrics for control group (all other tenants, last 3 days)
        const { data: allTenants } = await sb.from("tenant_settings").select("tenant_id");
        const controlTenantIds = allTenants
          ?.map((t) => t.tenant_id)
          .filter((id) => !canaryTenantIds.includes(id)) || [];

        const { data: controlMetrics } = await sb
          .from("forecast_accuracy")
          .select("predicted_sr, actual_sr, evaluation_date, tenant_id")
          .in("tenant_id", controlTenantIds)
          .gte("evaluation_date", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

        // Calculate MAE for both groups
        const calculateMAE = (metrics: any[]) => {
          if (!metrics?.length) return null;
          const errors = metrics.map((m) => Math.abs(m.predicted_sr - m.actual_sr));
          return errors.reduce((sum, e) => sum + e, 0) / errors.length;
        };

        const canaryMAE = calculateMAE(canaryMetrics || []);
        const controlMAE = calculateMAE(controlMetrics || []);

        if (canaryMAE === null || controlMAE === null) {
          console.log(`[evaluate-experiment] insufficient data for ${exp.id}`);
          continue;
        }

        // Get reliability metrics
        const { data: canaryReliability } = await sb
          .from("v_forecast_model_metrics_latest" as any)
          .select("reliability")
          .in("tenant_id", canaryTenantIds);

        const { data: controlReliability } = await sb
          .from("v_forecast_model_metrics_latest" as any)
          .select("reliability")
          .in("tenant_id", controlTenantIds);

        const avgCanaryReliability = canaryReliability && canaryReliability.length > 0
          ? canaryReliability.reduce((sum, r) => sum + (r.reliability || 0), 0) / canaryReliability.length
          : 0;
        const avgControlReliability = controlReliability && controlReliability.length > 0
          ? controlReliability.reduce((sum, r) => sum + (r.reliability || 0), 0) / controlReliability.length
          : 0;

        // 5) Decision logic
        const maeImprovement = controlMAE - canaryMAE; // Positive = canary is better
        const reliabilityImprovement = avgCanaryReliability - avgControlReliability;

        const shouldRollout =
          maeImprovement >= MAE_IMPROVEMENT_THRESHOLD ||
          reliabilityImprovement >= RELIABILITY_IMPROVEMENT_THRESHOLD;

        console.log("[evaluate-experiment] decision", {
          experiment_id: exp.id,
          canary_mae: canaryMAE.toFixed(2),
          control_mae: controlMAE.toFixed(2),
          mae_improvement: maeImprovement.toFixed(2),
          canary_reliability: avgCanaryReliability.toFixed(1),
          control_reliability: avgControlReliability.toFixed(1),
          reliability_improvement: reliabilityImprovement.toFixed(1),
          decision: shouldRollout ? "ROLLOUT" : "ROLLBACK",
        });

        if (shouldRollout) {
          // ROLLOUT: Apply canary weights to all opt-in tenants
          const { data: latestCanaryWeights } = await sb
            .from("ensemble_weight_history")
            .select("weight_arima, weight_gradient, weight_bayes, reliability, mae")
            .in("tenant_id", canaryTenantIds)
            .order("adjusted_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestCanaryWeights) {
            const { data: allOptInTenants } = await sb
              .from("tenant_settings")
              .select("tenant_id")
              .eq("self_tuning_enabled", true);

            for (const tenant of allOptInTenants || []) {
              await sb.from("ensemble_weight_history").insert({
                tenant_id: tenant.tenant_id,
                weight_arima: latestCanaryWeights.weight_arima,
                weight_gradient: latestCanaryWeights.weight_gradient,
                weight_bayes: latestCanaryWeights.weight_bayes,
                reliability: latestCanaryWeights.reliability,
                mae: latestCanaryWeights.mae,
              });
            }
          }

          // Mark experiment as succeeded
          await sb
            .from("model_experiments")
            .update({
              status: "succeeded",
              finished_at: new Date().toISOString(),
              notes: `Rollout successful: MAE improved by ${maeImprovement.toFixed(2)}pp, Reliability improved by ${reliabilityImprovement.toFixed(1)}pp`,
            })
            .eq("id", exp.id);

          console.log(`[evaluate-experiment] ROLLOUT completed for ${exp.id}`);
        } else {
          // ROLLBACK: Mark as rolled_back, don't propagate weights
          await sb
            .from("model_experiments")
            .update({
              status: "rolled_back",
              finished_at: new Date().toISOString(),
              notes: `Rollback: MAE improvement ${maeImprovement.toFixed(2)}pp (need ${MAE_IMPROVEMENT_THRESHOLD}), Reliability improvement ${reliabilityImprovement.toFixed(1)}pp (need ${RELIABILITY_IMPROVEMENT_THRESHOLD})`,
            })
            .eq("id", exp.id);

          console.log(`[evaluate-experiment] ROLLBACK executed for ${exp.id}`);
        }
      } catch (expError: any) {
        console.error(`[evaluate-experiment] error evaluating ${exp.id}:`, expError);
        await sb
          .from("model_experiments")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            notes: `Evaluation failed: ${expError.message}`,
          })
          .eq("id", exp.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: experiments.length }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[evaluate-experiment] error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
