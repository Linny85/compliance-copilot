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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[trigger-remediation] Starting auto-trigger scan');

    // Get all tenants with recommendations enabled
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('recommendations_enabled', true);

    const tenantIds = (tenantSettings || []).map((t: any) => t.tenant_id);
    console.log(`[trigger-remediation] Scanning ${tenantIds.length} tenants`);

    let triggeredCount = 0;

    for (const tid of tenantIds) {
      // Get high-confidence open recommendations
      const { data: recommendations } = await supabase
        .from('generated_recommendations')
        .select(`
          id,
          playbook_code,
          signal,
          weight,
          confidence,
          expected_impact,
          playbook_catalog!inner(trusted, severity, action_template)
        `)
        .eq('tenant_id', tid)
        .eq('status', 'open')
        .gte('confidence', 80)
        .gte('expected_impact', 6)
        .in('playbook_catalog.severity', ['high', 'critical'])
        .eq('playbook_catalog.trusted', true);

      if (!recommendations || recommendations.length === 0) continue;

      for (const rec of recommendations) {
        // Check if there's already a recent run for this playbook (last 24h)
        const { data: recentRun } = await supabase
          .from('remediation_runs')
          .select('id')
          .eq('tenant_id', tid)
          .eq('playbook_code', rec.playbook_code)
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (recentRun) {
          console.log(`[trigger-remediation] Skipping ${rec.playbook_code} for tenant ${tid} - recent run exists`);
          continue;
        }

        // Create remediation run
        const { data: run, error: insertError } = await supabase
          .from('remediation_runs')
          .insert({
            tenant_id: tid,
            playbook_code: rec.playbook_code,
            recommendation_id: rec.id,
            auto_triggered: true,
            parameters: {
              signal: rec.signal,
              action_template: (rec.playbook_catalog as any).action_template
            },
            confidence_before: rec.confidence,
            status: 'pending'
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[trigger-remediation] Insert error for ${rec.playbook_code}:`, insertError);
          continue;
        }

        console.log(`[trigger-remediation] Created run ${run.id} for playbook ${rec.playbook_code}`);

        // Invoke execute-remediation
        const { error: executeError } = await supabase.functions.invoke('execute-remediation', {
          body: { run_id: run.id }
        });

        if (executeError) {
          console.error(`[trigger-remediation] Execute error for run ${run.id}:`, executeError);
          // Mark as failed
          await supabase
            .from('remediation_runs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              result: { error: executeError.message }
            })
            .eq('id', run.id);
        } else {
          triggeredCount++;
        }
      }
    }

    console.log(`[trigger-remediation] Complete. Triggered ${triggeredCount} remediations`);

    return new Response(
      JSON.stringify({
        ok: true,
        tenants_scanned: tenantIds.length,
        remediations_triggered: triggeredCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[trigger-remediation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
