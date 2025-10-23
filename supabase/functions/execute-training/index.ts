// Phase 16B: execute-training - Process training jobs & update registry
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

    // 1) Fetch queued jobs
    const { data: jobs } = await sb
      .from("model_training_jobs")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(5); // Process up to 5 jobs per run

    if (!jobs?.length) {
      console.log("[execute-training] no queued jobs");
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    for (const job of jobs) {
      try {
        // Mark as running
        await sb
          .from("model_training_jobs")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", job.id);

        // Simulate training: adaptive weight adjustment based on metrics
        const metricsIn = job.metrics_in_before as any;
        const avgReliability = metricsIn?.avg_reliability ?? 75;
        const avgMae = metricsIn?.avg_mae ?? 3;

        // Adaptive learning: increase ARIMA if reliability is low, reduce if MAE high
        const learningRate = 0.05;
        const reliabilityDelta = (avgReliability - 75) / 100;
        const maeDelta = (5 - avgMae) / 10;

        // Get current weights
        const { data: currentWeights } = await sb
          .from("v_ensemble_weight_latest" as any)
          .select("weight_arima, weight_gradient, weight_bayes")
          .limit(1)
          .maybeSingle();

        let w_arima = currentWeights?.weight_arima ?? 0.33;
        let w_gradient = currentWeights?.weight_gradient ?? 0.33;
        let w_bayes = currentWeights?.weight_bayes ?? 0.34;

        // Apply adjustments
        w_arima = Math.min(0.6, Math.max(0.2, w_arima + reliabilityDelta * learningRate + maeDelta * learningRate * 0.5));
        w_gradient = Math.min(0.6, Math.max(0.2, w_gradient - maeDelta * learningRate));
        w_bayes = 1 - (w_arima + w_gradient);

        // Register new model version
        const version = `v1.${Date.now()}`;
        const { error: regError } = await sb.from("model_registry").insert({
          family: job.family,
          version,
          artifact_url: `s3://models/${job.family}/${version}`,
          created_by: "system",
          notes: `Auto-trained by job ${job.id}`,
        });

        if (regError) throw regError;

        // Write new weights to history (for canary tenants)
        const { data: canaryAssignments } = await sb
          .from("model_experiment_assignments")
          .select("tenant_id, experiment_id")
          .eq("experiment_id", (await sb.from("model_experiments").select("id").eq("status", "running").eq("family", "ensemble").maybeSingle()).data?.id || "");

        if (canaryAssignments?.length) {
          for (const assignment of canaryAssignments) {
            await sb.from("ensemble_weight_history").insert({
              tenant_id: assignment.tenant_id,
              weight_arima: Number(w_arima.toFixed(2)),
              weight_gradient: Number(w_gradient.toFixed(2)),
              weight_bayes: Number(w_bayes.toFixed(2)),
              reliability: avgReliability,
              mae: avgMae,
            });
          }
        }

        // Compute expected improvement (heuristic)
        const expectedReliability = avgReliability + (reliabilityDelta > 0 ? 2 : -1);
        const expectedMae = avgMae - (maeDelta > 0 ? 0.3 : 0);

        // Mark job as succeeded
        await sb
          .from("model_training_jobs")
          .update({
            status: "succeeded",
            finished_at: new Date().toISOString(),
            metrics_out_after: {
              version,
              weights: { arima: w_arima, gradient: w_gradient, bayes: w_bayes },
              expected_reliability: expectedReliability,
              expected_mae: expectedMae,
            },
            logs: `Training completed successfully. New weights: ARIMA=${w_arima.toFixed(2)}, Gradient=${w_gradient.toFixed(2)}, Bayes=${w_bayes.toFixed(2)}`,
          })
          .eq("id", job.id);

        console.log("[execute-training] job succeeded", {
          job_id: job.id,
          version,
          weights: { w_arima, w_gradient, w_bayes },
          canary_tenants: canaryAssignments?.length || 0,
        });
      } catch (jobError: any) {
        console.error("[execute-training] job failed:", job.id, jobError);
        await sb
          .from("model_training_jobs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            logs: `Error: ${jobError.message}`,
          })
          .eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: jobs.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[execute-training] error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
