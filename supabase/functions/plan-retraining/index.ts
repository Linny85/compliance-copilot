// Phase 16B: plan-retraining - Candidate detection & experiment planning
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RELIABILITY_MIN = 70;
const MAE_MAX = 5;
const BIAS_MAX = 2.5;
const CANARY_FRACTION = 0.2; // 20%

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(URL, SERVICE);

    // 1) Load retrain candidates (poor reliability/MAE/bias)
    const { data: candidates } = await sb
      .from("v_retrain_candidates" as any)
      .select("tenant_id, reliability, mae_recent, bias_recent, sample_size");

    if (!candidates?.length) {
      console.log("[plan-retraining] no candidates found");
      return new Response(JSON.stringify({ ok: true, candidates: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Filter by thresholds
    const needsRetraining = candidates.filter(
      (c) =>
        (c.reliability < RELIABILITY_MIN ||
          c.mae_recent > MAE_MAX ||
          Math.abs(c.bias_recent) > BIAS_MAX) &&
        c.sample_size >= 10
    );

    if (!needsRetraining.length) {
      console.log("[plan-retraining] no tenants meet thresholds");
      return new Response(JSON.stringify({ ok: true, candidates: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2) Check feature flags
    const { data: eligible } = await sb
      .from("tenant_settings")
      .select("tenant_id")
      .in("tenant_id", needsRetraining.map((c) => c.tenant_id))
      .eq("self_tuning_enabled", true)
      .eq("canary_opt_in", true);

    if (!eligible?.length) {
      console.log("[plan-retraining] no eligible tenants (flags disabled)");
      return new Response(JSON.stringify({ ok: true, candidates: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const eligibleIds = eligible.map((e) => e.tenant_id);
    const finalCandidates = needsRetraining.filter((c) =>
      eligibleIds.includes(c.tenant_id)
    );

    // 3) Check if experiment already running
    const { data: existingExp } = await sb
      .from("model_experiments")
      .select("id, status")
      .eq("family", "ensemble")
      .in("status", ["draft", "running"])
      .maybeSingle();

    if (existingExp) {
      console.log("[plan-retraining] experiment already running:", existingExp.id);
      return new Response(
        JSON.stringify({ ok: true, existing_experiment: existingExp.id }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 4) Create new experiment
    const experimentName = `ensemble-retrain-${new Date().toISOString().split("T")[0]}`;
    const { data: newExp, error: expError } = await sb
      .from("model_experiments")
      .insert({
        name: experimentName,
        family: "ensemble",
        variant: { learning_rate: 0.05, target: "adaptive_weights" },
        allocation: CANARY_FRACTION,
        status: "draft",
        owner: "system",
        notes: `Triggered by low performance: ${finalCandidates.length} tenants`,
      })
      .select()
      .single();

    if (expError) throw expError;

    // 5) Randomly assign ~20% of candidates to canary
    const canaryCount = Math.ceil(finalCandidates.length * CANARY_FRACTION);
    const shuffled = [...finalCandidates].sort(() => Math.random() - 0.5);
    const canaryTenants = shuffled.slice(0, canaryCount);

    const assignments = canaryTenants.map((t) => ({
      experiment_id: newExp.id,
      tenant_id: t.tenant_id,
      sticky: true,
    }));

    const { error: assignError } = await sb
      .from("model_experiment_assignments")
      .insert(assignments);

    if (assignError) throw assignError;

    // 6) Create training job
    const triggerReasons = [];
    if (finalCandidates.some((c) => c.reliability < RELIABILITY_MIN))
      triggerReasons.push("reliability_low");
    if (finalCandidates.some((c) => c.mae_recent > MAE_MAX))
      triggerReasons.push("mae_high");
    if (finalCandidates.some((c) => Math.abs(c.bias_recent) > BIAS_MAX))
      triggerReasons.push("bias");

    const { error: jobError } = await sb.from("model_training_jobs").insert({
      family: "ensemble",
      target_version: `v1.${Date.now()}`,
      status: "queued",
      trigger_reason: triggerReasons.join(", "),
      metrics_in_before: {
        avg_reliability: finalCandidates.reduce((sum, c) => sum + c.reliability, 0) / finalCandidates.length,
        avg_mae: finalCandidates.reduce((sum, c) => sum + c.mae_recent, 0) / finalCandidates.length,
      },
    });

    if (jobError) throw jobError;

    // 7) Activate experiment
    await sb
      .from("model_experiments")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", newExp.id);

    console.log("[plan-retraining] experiment created", {
      id: newExp.id,
      candidates: finalCandidates.length,
      canary: canaryTenants.length,
      reasons: triggerReasons,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        experiment_id: newExp.id,
        candidates: finalCandidates.length,
        canary_count: canaryTenants.length,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[plan-retraining] error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
