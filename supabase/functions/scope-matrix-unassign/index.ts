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
    const { control_id, scope_ref } = body;

    if (!control_id || !scope_ref?.type || !scope_ref?.id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get existing for audit
    const { data: existing } = await supabaseClient
      .from('policy_assignments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('control_id', control_id)
      .eq('scope_ref', JSON.stringify(scope_ref))
      .single();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete assignment
    const { error: deleteError } = await supabaseClient
      .from('policy_assignments')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('control_id', control_id)
      .eq('scope_ref', JSON.stringify(scope_ref));

    if (deleteError) {
      console.error('[scope-matrix-unassign] Delete error:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await logEvent(serviceClient, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'scope.assign.remove',
      entity: 'policy_assignment',
      entity_id: existing.id,
      payload: {
        control_id,
        scope_ref,
        removed_state: {
          owner_id: existing.owner_id,
          inheritance_rule: existing.inheritance_rule,
          exception_flag: existing.exception_flag
        }
      }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[scope-matrix-unassign] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
