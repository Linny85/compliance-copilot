import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));

    const { tenant_id, recommendation_id, action, until } = await req.json();

    // Validate input
    if (!tenant_id || !recommendation_id || !action) {
      return new Response(
        JSON.stringify({ error: 'tenant_id, recommendation_id, and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['apply', 'dismiss', 'snooze'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action must be apply, dismiss, or snooze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'snooze' && !until) {
      return new Response(
        JSON.stringify({ error: 'until is required for snooze action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Get current recommendation
    const { data: rec, error: fetchError } = await supabase
      .from('generated_recommendations')
      .select('*')
      .eq('id', recommendation_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!rec) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency check - if already in target state, just return success
    if (action === 'apply' && rec.status === 'applied') {
      return new Response(
        JSON.stringify({ ok: true, message: 'Already applied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'dismiss' && rec.status === 'dismissed') {
      return new Response(
        JSON.stringify({ ok: true, message: 'Already dismissed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update recommendation status
    const updates: any = {
      status: action === 'apply' ? 'applied' : action === 'dismiss' ? 'dismissed' : 'snoozed'
    };

    if (action === 'snooze') {
      updates.snooze_until = until;
    }

    const { error: updateError } = await supabase
      .from('generated_recommendations')
      .update(updates)
      .eq('id', recommendation_id);

    if (updateError) throw updateError;

    // Insert audit log
    const { error: auditError } = await supabase
      .from('recommendation_actions')
      .insert({
        recommendation_id,
        tenant_id,
        action,
        actor: userId,
        details: action === 'snooze' ? { until } : {}
      });

    if (auditError) {
      console.error('[act-on-recommendation] Audit insert error:', auditError);
      // Don't fail the request if audit fails
    }

    console.log(`[act-on-recommendation] Action ${action} on recommendation ${recommendation_id} by user ${userId}`);

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        recommendation_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[act-on-recommendation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
