import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[recompute-explainability-weights] Starting nightly weight refinement');

    // Get all tenants with explainability enabled
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('explainability_enabled', true);

    const tenantIds = (tenantSettings || []).map((t: any) => t.tenant_id);
    console.log(`[recompute-explainability-weights] Processing ${tenantIds.length} tenants`);

    let weightsUpdated = 0;

    for (const tenant_id of tenantIds) {
      // Get recent MAE data (7 days)
      const { data: accuracy } = await supabase
        .from('forecast_accuracy' as any)
        .select('*')
        .eq('tenant_id', tenant_id)
        .gte('evaluation_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('evaluation_date', { ascending: false });

      if (!accuracy || accuracy.length < 3) continue;

      // Calculate average MAE
      const avgMae = accuracy.reduce((sum: number, a: any) => sum + Math.abs(a.predicted_sr - a.actual_sr), 0) / accuracy.length;

      // Get current signals
      const { data: signals } = await supabase
        .from('explainability_signals')
        .select('*')
        .eq('tenant_id', tenant_id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!signals || signals.length === 0) continue;

      // Simple impact heuristic: signals with high absolute value correlating with MAE changes
      for (const signal of signals) {
        const signalKey = `${signal.feature}:${signal.key}:${signal.metric}`;
        
        // Get current weight
        const { data: currentWeight } = await supabase
          .from('explainability_signal_weights')
          .select('*')
          .eq('tenant_id', tenant_id)
          .eq('feature', signal.feature)
          .eq('key', signal.key)
          .eq('metric', signal.metric)
          .maybeSingle();

        // Simple impact: if signal value is high and MAE is high, assume correlation
        const impactFactor = Math.abs(signal.value) > 0.3 && avgMae > 5 ? 0.05 : -0.02;
        
        if (currentWeight) {
          const newWeight = clamp(currentWeight.weight + impactFactor, 0.5, 2.0);
          const newMaeImpact = avgMae;

          await supabase
            .from('explainability_signal_weights')
            .update({
              weight: newWeight,
              mae_impact: newMaeImpact,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentWeight.id);

          weightsUpdated++;
        }
      }
    }

    console.log(`[recompute-explainability-weights] Complete. Updated ${weightsUpdated} weights`);

    return new Response(
      JSON.stringify({
        ok: true,
        tenants_processed: tenantIds.length,
        weights_updated: weightsUpdated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[recompute-explainability-weights] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
