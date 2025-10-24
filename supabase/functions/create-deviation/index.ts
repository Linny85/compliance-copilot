import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      control_id,
      scope_ref,
      title,
      description,
      severity = 'medium',
      mitigation,
      valid_to,
      risk_ref,
    } = await req.json();

    if (!control_id || !title) {
      return new Response(
        JSON.stringify({ error: 'control_id and title are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get tenant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[create-deviation] Profile lookup failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to determine tenant' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tenant_id = profile.company_id;

    // Verify control exists
    const { error: controlError } = await supabaseClient
      .from('controls')
      .select('id')
      .eq('id', control_id)
      .single();

    if (controlError) {
      return new Response(
        JSON.stringify({ error: 'Invalid control_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate SLA and recert dates
    const now = new Date();
    const sla_due_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const recert_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const valid_from = now;
    const computed_valid_to = valid_to
      ? new Date(valid_to)
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default

    // Create deviation
    const { data: deviation, error: insertError } = await supabaseClient
      .from('deviations')
      .insert({
        tenant_id,
        control_id,
        scope_ref,
        title,
        description,
        severity,
        mitigation,
        risk_ref,
        requested_by: user.id,
        status: 'draft',
        valid_from: valid_from.toISOString(),
        valid_to: computed_valid_to.toISOString(),
        sla_due_at: sla_due_at.toISOString(),
        recert_at: recert_at.toISOString(),
        source: { type: 'manual', created_by: user.id },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-deviation] Insert failed:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create deviation', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Audit log (additional to DB trigger)
    await logEvent(supabaseClient, {
      tenant_id,
      actor_id: user.id,
      action: 'deviation.create',
      entity: 'deviation',
      entity_id: deviation.id,
      payload: { control_id, severity, status: 'draft' },
    });

    console.log('[create-deviation] Created:', deviation.id);

    return new Response(JSON.stringify({ deviation }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[create-deviation] Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
