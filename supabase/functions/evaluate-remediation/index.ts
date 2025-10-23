import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

async function computeSRDelta(
  supabase: any,
  tenantId: string,
  playbookCode: string,
  runStartedAt: string
): Promise<number> {
  // Compare SR before (48h before run) vs after (24h after run)
  const before = new Date(new Date(runStartedAt).getTime() - 48 * 60 * 60 * 1000);
  const after = new Date(new Date(runStartedAt).getTime() + 24 * 60 * 60 * 1000);

  const { data: beforeData } = await supabase
    .from('check_results')
    .select('outcome')
    .eq('tenant_id', tenantId)
    .gte('created_at', before.toISOString())
    .lt('created_at', runStartedAt);

  const { data: afterData } = await supabase
    .from('check_results')
    .select('outcome')
    .eq('tenant_id', tenantId)
    .gte('created_at', runStartedAt)
    .lte('created_at', after.toISOString());

  if (!beforeData || beforeData.length < 10 || !afterData || afterData.length < 10) {
    return 0; // Not enough data
  }

  const srBefore = (beforeData.filter((r: any) => r.outcome === 'pass').length / beforeData.length) * 100;
  const srAfter = (afterData.filter((r: any) => r.outcome === 'pass').length / afterData.length) * 100;

  return srAfter - srBefore;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[evaluate-remediation] Starting evaluation');

    // Get all completed runs from last 48h that haven't been evaluated yet (impact is null)
    const { data: runs } = await supabase
      .from('remediation_runs')
      .select('*')
      .eq('status', 'success')
      .is('impact', null)
      .gte('completed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (!runs || runs.length === 0) {
      console.log('[evaluate-remediation] No runs to evaluate');
      return new Response(
        JSON.stringify({ ok: true, evaluated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[evaluate-remediation] Evaluating ${runs.length} runs`);

    let evaluatedCount = 0;

    for (const run of runs) {
      // Compute SR delta
      const delta = await computeSRDelta(
        supabase,
        run.tenant_id,
        run.playbook_code,
        run.started_at
      );

      console.log(`[evaluate-remediation] Run ${run.id}: SR delta = ${delta.toFixed(2)}`);

      // Adjust confidence based on impact
      let confidenceAdjustment = 0;
      if (delta > 2) {
        confidenceAdjustment = 5; // Good impact
      } else if (delta > 0) {
        confidenceAdjustment = 2; // Slight positive impact
      } else if (delta < -2) {
        confidenceAdjustment = -5; // Negative impact
      } else {
        confidenceAdjustment = -1; // Neutral/no impact
      }

      // Get current playbook default_impact
      const { data: playbook } = await supabase
        .from('playbook_catalog')
        .select('default_impact')
        .eq('code', run.playbook_code)
        .single();

      const currentImpact = playbook?.default_impact || 3.0;
      const newImpact = clamp(currentImpact + (delta * 0.1), 1.0, 10.0);

      // Update playbook impact
      await supabase
        .from('playbook_catalog')
        .update({ default_impact: newImpact })
        .eq('code', run.playbook_code);

      // Get signal weight if exists
      const signal = run.parameters?.signal;
      if (signal) {
        const { data: weight } = await supabase
          .from('explainability_signal_weights')
          .select('*')
          .eq('tenant_id', run.tenant_id)
          .eq('feature', signal.feature)
          .eq('key', signal.key)
          .eq('metric', signal.metric)
          .maybeSingle();

        if (weight) {
          const newConfidence = clamp(weight.confidence + confidenceAdjustment, 0, 100);
          await supabase
            .from('explainability_signal_weights')
            .update({
              confidence: newConfidence,
              updated_at: new Date().toISOString()
            })
            .eq('id', weight.id);

          // Update run with confidence after
          await supabase
            .from('remediation_runs')
            .update({
              impact: delta,
              confidence_after: newConfidence
            })
            .eq('id', run.id);
        } else {
          // Just update impact
          await supabase
            .from('remediation_runs')
            .update({ impact: delta })
            .eq('id', run.id);
        }
      } else {
        await supabase
          .from('remediation_runs')
          .update({ impact: delta })
          .eq('id', run.id);
      }

      evaluatedCount++;
    }

    console.log(`[evaluate-remediation] Complete. Evaluated ${evaluatedCount} runs`);

    return new Response(
      JSON.stringify({
        ok: true,
        evaluated: evaluatedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[evaluate-remediation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
