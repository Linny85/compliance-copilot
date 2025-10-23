import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { approval_id, action, comment } = await req.json();

    if (!approval_id || !action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request. Required: approval_id, action (approve|reject)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[approve-action] User ${user.id} ${action}ing approval ${approval_id}`);

    // Get approval
    const { data: approval, error: fetchError } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', approval_id)
      .single();

    if (fetchError || !approval) {
      return new Response(
        JSON.stringify({ error: 'Approval not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (approval.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Approval already ${approval.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', approval.tenant_id)
      .in('role', ['admin', 'master_admin']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update approval
    const { error: updateError } = await supabase
      .from('approvals')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        decided_by: user.id,
        decided_at: new Date().toISOString()
      })
      .eq('id', approval_id);

    if (updateError) throw updateError;

    // Audit log
    await logEvent(supabase, {
      tenant_id: approval.tenant_id,
      actor_id: user.id,
      action: action === 'approve' ? 'approval.approved' : 'approval.rejected',
      entity: 'approval',
      entity_id: approval_id,
      payload: {
        resource_type: approval.resource_type,
        resource_id: approval.resource_id,
        action: approval.action,
        comment
      }
    });

    // If approved, execute the action
    if (action === 'approve') {
      console.log(`[approve-action] Executing approved action for ${approval.resource_type}`);
      
      // Here you would trigger the actual action based on resource_type
      // For example: create remediation run, dispatch integration, etc.
      // This is a placeholder for the actual execution logic
      
      if (approval.resource_type === 'remediation_run') {
        // Trigger remediation execution
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const serviceSupabase = createClient(supabaseUrl, serviceKey);
        
        await serviceSupabase.functions.invoke('execute-remediation', {
          body: { run_id: approval.resource_id }
        });
      }
    }

    console.log(`[approve-action] Approval ${approval_id} ${action}ed by ${user.id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        approval_id,
        action,
        status: action === 'approve' ? 'approved' : 'rejected'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[approve-action] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
