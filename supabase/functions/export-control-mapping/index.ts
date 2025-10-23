import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth = req.headers.get('Authorization') || '';
  const sbAuth = createClient(url, anon, { global: { headers: { Authorization: auth } } });

  try {
    // --- Auth + Tenant ---
    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await sbAuth
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const tenant_id = profile?.company_id;
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'No tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin check
    const { data: roles } = await sbAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', tenant_id)
      .in('role', ['admin', 'master_admin']);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'FORBIDDEN_ADMIN_ONLY' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Parse filters ---
    const body = await req.json().catch(() => ({}));
    const filters = body.filters || {};
    const { q, severity = [], outcome = [], withRulesOnly } = filters;

    console.log('[export-control-mapping]', { tenant_id, filters });

    // --- Get controls ---
    let controlsQuery = sbAuth
      .from('controls')
      .select('id, code, title');

    if (q && q.trim().length >= 2) {
      const qClean = q.trim().replaceAll('%', '').replaceAll('_', '');
      controlsQuery = controlsQuery.or(`code.ilike.%${qClean}%,title.ilike.%${qClean}%`);
    }

    const { data: controls, error: controlsError } = await controlsQuery.limit(10000);
    if (controlsError) throw controlsError;

    if (!controls || controls.length === 0) {
      const csv = 'control_code,control_title,rule_code,rule_title,severity,last_outcome,last_at\n';
      const bom = '\uFEFF';
      return new Response(bom + csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="control_mapping_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    const controlIds = controls.map(c => c.id);

    // --- Get rules ---
    let rulesQuery = sbAuth
      .from('check_rules')
      .select('id, code, title, severity, control_id')
      .eq('tenant_id', tenant_id)
      .in('control_id', controlIds);

    if (Array.isArray(severity) && severity.length > 0) {
      rulesQuery = rulesQuery.in('severity', severity);
    }

    const { data: rules, error: rulesError } = await rulesQuery.limit(10000);
    if (rulesError) throw rulesError;

    // --- Get latest results ---
    const ruleIds = (rules || []).map(r => r.id);
    let resultsQuery = sbAuth
      .from('check_results')
      .select('rule_id, outcome, created_at')
      .eq('tenant_id', tenant_id);

    if (ruleIds.length > 0) {
      resultsQuery = resultsQuery.in('rule_id', ruleIds);
    }

    if (Array.isArray(outcome) && outcome.length > 0) {
      resultsQuery = resultsQuery.in('outcome', outcome);
    }

    const { data: results, error: resultsError } = await resultsQuery
      .order('created_at', { ascending: false })
      .limit(10000);
    if (resultsError) throw resultsError;

    // --- Build result map ---
    const latestResultMap = new Map<string, { outcome: string; created_at: string }>();
    (results || []).forEach((r: any) => {
      if (!latestResultMap.has(r.rule_id)) {
        latestResultMap.set(r.rule_id, { outcome: r.outcome, created_at: r.created_at });
      }
    });

    // --- Build CSV ---
    const csvHeader = 'control_code,control_title,rule_code,rule_title,severity,last_outcome,last_at';
    const csvRows: string[] = [];

    controls.forEach((c: any) => {
      const controlRules = (rules || []).filter(r => r.control_id === c.id);
      
      if (withRulesOnly && controlRules.length === 0) return;

      if (controlRules.length === 0) {
        csvRows.push([
          c.code || '',
          `"${(c.title || '').replaceAll('"', '""')}"`,
          '',
          '',
          '',
          '',
          ''
        ].join(','));
      } else {
        controlRules.forEach((r: any) => {
          const lastResult = latestResultMap.get(r.id);
          csvRows.push([
            c.code || '',
            `"${(c.title || '').replaceAll('"', '""')}"`,
            r.code || '',
            `"${(r.title || '').replaceAll('"', '""')}"`,
            r.severity || '',
            lastResult?.outcome || '',
            lastResult?.created_at || ''
          ].join(','));
        });
      }
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="control_mapping_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (e: any) {
    console.error('[export-control-mapping]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
