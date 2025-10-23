import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionTemplate {
  type: 'create_task' | 'notify_team' | 'update_flag' | 'invoke_function' | 'rollback';
  target?: string;
  params?: any;
}

async function executeAction(action: ActionTemplate, params: any): Promise<{ success: boolean; details: any }> {
  console.log(`[execute-remediation] Executing action type: ${action.type}`);

  switch (action.type) {
    case 'create_task':
      // Stub: In production, this would call Jira/Asana API
      return {
        success: true,
        details: {
          task_created: true,
          task_id: 'STUB-' + Math.random().toString(36).substr(2, 9),
          target: action.target,
          title: action.params?.title,
          labels: action.params?.labels
        }
      };

    case 'notify_team':
      // Stub: In production, this would call Slack/Teams webhook
      return {
        success: true,
        details: {
          notification_sent: true,
          target: action.target,
          message: action.params?.message
        }
      };

    case 'update_flag':
      // Stub: In production, this would update a feature flag or setting
      return {
        success: true,
        details: {
          flag_updated: true,
          flag: action.params?.flag,
          value: action.params?.value
        }
      };

    case 'invoke_function':
      // Stub: In production, this would call another edge function
      return {
        success: true,
        details: {
          function_invoked: true,
          function: action.params?.function,
          result: 'stub'
        }
      };

    case 'rollback':
      // Stub: Rollback logic
      return {
        success: true,
        details: {
          rolled_back: true,
          original_action: params.original_action
        }
      };

    default:
      return {
        success: false,
        details: { error: 'Unknown action type' }
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { run_id } = await req.json();

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[execute-remediation] Processing run ${run_id}`);

    // Get run details
    const { data: run, error: fetchError } = await supabase
      .from('remediation_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (fetchError || !run) {
      return new Response(
        JSON.stringify({ error: 'Run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to executing
    await supabase
      .from('remediation_runs')
      .update({ status: 'executing' })
      .eq('id', run_id);

    // Execute the action
    const actionTemplate: ActionTemplate = run.parameters?.action_template;
    const result = await executeAction(actionTemplate, run.parameters);

    // Update run with result
    const { error: updateError } = await supabase
      .from('remediation_runs')
      .update({
        status: result.success ? 'success' : 'failed',
        completed_at: new Date().toISOString(),
        result: result.details
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('[execute-remediation] Update error:', updateError);
    }

    console.log(`[execute-remediation] Run ${run_id} completed: ${result.success ? 'success' : 'failed'}`);

    return new Response(
      JSON.stringify({
        ok: true,
        run_id,
        status: result.success ? 'success' : 'failed',
        result: result.details
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[execute-remediation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
