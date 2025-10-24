import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await sb.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No company found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = profile.company_id;

    // Get company data
    const { data: company } = await sb
      .from('Unternehmen')
      .select('name, legal_name, country, industry, onboarding_done, onboarding_progress')
      .eq('id', tenantId)
      .single();

    // Get counts
    const [ouResult, assetResult, processResult, fwResult, assignResult, evidenceResult, checkResult] =
      await Promise.all([
        sb.from('orgunits').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        sb.from('assets').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        sb.from('processes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        sb.from('tenant_frameworks').select('framework_code', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        sb.from('policy_assignments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        sb.from('evidence_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        sb.from('check_rules').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);

    const status = {
      has_company: !!company?.legal_name,
      ou_count: ouResult.count ?? 0,
      asset_count: assetResult.count ?? 0,
      process_count: processResult.count ?? 0,
      frameworks_count: fwResult.count ?? 0,
      assignments_count: assignResult.count ?? 0,
      first_evidence: (evidenceResult.count ?? 0) > 0,
      first_check: (checkResult.count ?? 0) > 0,
      notifications_set: true, // Default to true for now
      onboarding_done: company?.onboarding_done ?? false,
      progress: company?.onboarding_progress ?? 0,
    };

    // Calculate weighted progress
    let calculatedProgress = 0;
    if (status.has_company) calculatedProgress += 10;
    if (status.ou_count > 0) calculatedProgress += 15;
    if (status.asset_count > 0) calculatedProgress += 15;
    if (status.frameworks_count > 0) calculatedProgress += 20;
    if (status.assignments_count > 0) calculatedProgress += 20;
    if (status.first_evidence) calculatedProgress += 10;
    if (status.first_check) calculatedProgress += 10;

    status.progress = Math.min(calculatedProgress, 100);

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[onboarding-status]', error);
    return new Response(
      JSON.stringify({ error: 'status_failed', details: String(error?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
