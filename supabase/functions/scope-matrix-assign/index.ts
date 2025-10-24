import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tenantId = profile.company_id;
    const body = await req.json();
    const {
      control_id,
      scope_ref,
      owner_id,
      inheritance_rule = 'inherit',
      exception_flag = false,
      exception_reason = null
    } = body;

    if (!control_id || !scope_ref?.type || !scope_ref?.id || !owner_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for existing assignment to log prev_state
    const { data: existing } = await supabaseClient
      .from('policy_assignments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('control_id', control_id)
      .eq('scope_ref', JSON.stringify(scope_ref))
      .single();

    // Upsert assignment
    const { data: assignment, error: upsertError } = await supabaseClient
      .from('policy_assignments')
      .upsert({
        tenant_id: tenantId,
        control_id,
        scope_ref,
        owner_id,
        inheritance_rule,
        exception_flag,
        exception_reason
      }, {
        onConflict: 'tenant_id,control_id,scope_ref'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[scope-matrix-assign] Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await logEvent(serviceClient, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'scope.assign.set',
      entity: 'policy_assignment',
      entity_id: assignment.id,
      payload: {
        control_id,
        scope_ref,
        prev_state: existing ? {
          owner_id: existing.owner_id,
          inheritance_rule: existing.inheritance_rule,
          exception_flag: existing.exception_flag
        } : null,
        new_state: {
          owner_id,
          inheritance_rule,
          exception_flag
        }
      }
    });

    return new Response(JSON.stringify({ success: true, assignment }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[scope-matrix-assign] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
