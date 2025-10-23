import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Clamp value between min and max
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));

    const { tenant_id, feature, key, metric, verdict, weight, context } = await req.json();

    // Validate input
    if (!tenant_id || !feature || !key || !metric || !verdict) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['useful', 'not_useful', 'irrelevant'].includes(verdict)) {
      return new Response(
        JSON.stringify({ error: 'Invalid verdict. Must be useful, not_useful, or irrelevant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from('explainability_feedback')
      .insert({
        tenant_id,
        signal_feature: feature,
        signal_key: key,
        signal_metric: metric,
        verdict,
        weight: weight || 1.0,
        noted_by: userId,
        context: context || {}
      });

    if (feedbackError) throw feedbackError;

    // Get current weight or create default
    const { data: currentWeight } = await supabase
      .from('explainability_signal_weights')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('feature', feature)
      .eq('key', key)
      .eq('metric', metric)
      .maybeSingle();

    // Calculate delta based on verdict
    const delta = verdict === 'useful' ? 1 : verdict === 'not_useful' ? -1 : -0.5;
    
    // Bayesian update
    const oldSample = currentWeight?.sample || 0;
    const oldWeight = currentWeight?.weight || 1.0;
    const lr = 0.2 / Math.sqrt(oldSample + 1); // Learning rate decreases with more samples
    const newWeight = clamp(oldWeight + lr * delta, 0.5, 2.0);
    
    // Calculate confidence (increases with consistent feedback)
    const newSample = oldSample + 1;
    const baseConfidence = Math.min(100, 50 + (newSample * 2));
    const newConfidence = clamp(baseConfidence, 0, 100);

    // Upsert weight
    if (currentWeight) {
      const { error: updateError } = await supabase
        .from('explainability_signal_weights')
        .update({
          weight: newWeight,
          confidence: newConfidence,
          sample: newSample,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentWeight.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('explainability_signal_weights')
        .insert({
          tenant_id,
          feature,
          key,
          metric,
          weight: newWeight,
          confidence: newConfidence,
          sample: newSample
        });

      if (insertError) throw insertError;
    }

    console.log(`[post-explainability-feedback] Updated weight for ${feature}:${key} (${metric}) to ${newWeight.toFixed(3)} (confidence: ${newConfidence.toFixed(0)}%, n=${newSample})`);

    return new Response(
      JSON.stringify({
        ok: true,
        weight: newWeight,
        confidence: newConfidence,
        sample: newSample
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[post-explainability-feedback] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
