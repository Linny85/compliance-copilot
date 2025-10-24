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
      conflict_kind,
      scope_ref,
      control_id,
      dedupe = true
    } = body;

    if (!dedupe) {
      return new Response(JSON.stringify({ error: 'dedupe must be true' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all conflicts for tenant
    let conflictsQuery = supabaseClient
      .from('v_scope_conflicts')
      .select('*')
      .eq('tenant_id', tenantId);

    if (conflict_kind) {
      conflictsQuery = conflictsQuery.eq('conflict_kind', conflict_kind);
    }
    if (scope_ref) {
      conflictsQuery = conflictsQuery
        .eq('scope_type', scope_ref.type)
        .eq('scope_id', scope_ref.id);
    }
    if (control_id) {
      conflictsQuery = conflictsQuery.eq('control_id', control_id);
    }

    const { data: conflicts, error: conflictsError } = await conflictsQuery;

    if (conflictsError) {
      console.error('[scope-matrix-fix-conflicts] Error fetching conflicts:', conflictsError);
      return new Response(JSON.stringify({ error: conflictsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!conflicts || conflicts.length === 0) {
      return new Response(JSON.stringify({ success: true, fixed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalFixed = 0;

    // Process each conflict
    for (const conflict of conflicts) {
      const { control_id: cid, scope_type, scope_id, conflict_kind: kind } = conflict;

      // Get all assignments for this tuple
      const { data: assignments } = await supabaseClient
        .from('policy_assignments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('control_id', cid)
        .eq('scope_ref->type', scope_type)
        .eq('scope_ref->id', scope_id)
        .order('updated_at', { ascending: false });

      if (!assignments || assignments.length <= 1) continue;

      let toDelete = [];

      if (kind === 'override_vs_inherit') {
        // Keep newest override, delete all inherit
        const overrides = assignments.filter(a => a.inheritance_rule === 'override');
        const inherits = assignments.filter(a => a.inheritance_rule === 'inherit');
        
        if (overrides.length > 0) {
          // Keep newest override, delete all inherits and older overrides
          const [keepOverride, ...oldOverrides] = overrides;
          toDelete = [...inherits, ...oldOverrides];
        } else {
          // Shouldn't happen, but keep newest
          toDelete = assignments.slice(1);
        }
      } else if (kind === 'duplicate_assignments') {
        // Keep newest, delete older
        toDelete = assignments.slice(1);
      }

      // Delete duplicates
      for (const dup of toDelete) {
        await supabaseClient
          .from('policy_assignments')
          .delete()
          .eq('id', dup.id);
        
        totalFixed++;
      }
    }

    // Audit log
    await logEvent(serviceClient, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'scope.conflict.fixed',
      entity: 'policy_assignments',
      entity_id: tenantId,
      payload: {
        conflict_kind,
        conflicts_count: conflicts.length,
        fixed_count: totalFixed
      }
    });

    return new Response(JSON.stringify({ success: true, fixed: totalFixed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[scope-matrix-fix-conflicts] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
