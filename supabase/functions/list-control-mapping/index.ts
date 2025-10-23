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

    // --- Parse body ---
    const body = await req.json().catch(() => ({}));
    const {
      page = 1,
      pageSize = 50,
      filters = {}
    } = body;

    const { q, severity = [], outcome = [], withRulesOnly } = filters;
    const cappedPageSize = Math.min(pageSize, 200);
    const from = (page - 1) * cappedPageSize;
    const to = from + cappedPageSize - 1;

    console.log('[list-control-mapping]', { tenant_id, page, pageSize: cappedPageSize, filters });

    // --- First, get all controls for this tenant ---
    let controlsQuery = sbAuth
      .from('controls')
      .select('id, code, title, framework_id', { count: 'exact' });

    // Control search filter
    if (q && q.trim().length >= 2) {
      const qClean = q.trim().replaceAll('%', '').replaceAll('_', '');
      controlsQuery = controlsQuery.or(`code.ilike.%${qClean}%,title.ilike.%${qClean}%`);
    }

    const { data: controls, error: controlsError, count } = await controlsQuery.range(from, to);
    if (controlsError) throw controlsError;

    if (!controls || controls.length === 0) {
      return new Response(JSON.stringify({
        items: [],
        pagination: { page, pageSize: cappedPageSize, total: 0, totalPages: 0 }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const controlIds = controls.map(c => c.id);

    // --- Get rules for these controls ---
    let rulesQuery = sbAuth
      .from('check_rules')
      .select('id, code, title, severity, control_id')
      .eq('tenant_id', tenant_id)
      .in('control_id', controlIds)
      .is('deleted_at', null);

    if (Array.isArray(severity) && severity.length > 0) {
      rulesQuery = rulesQuery.in('severity', severity);
    }

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) throw rulesError;

    // --- Get latest result for each rule ---
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

    const { data: results, error: resultsError } = await resultsQuery.order('created_at', { ascending: false });
    if (resultsError) throw resultsError;

    // --- Build map: ruleId -> latest result ---
    const latestResultMap = new Map<string, { outcome: string; created_at: string }>();
    (results || []).forEach((r: any) => {
      if (!latestResultMap.has(r.rule_id)) {
        latestResultMap.set(r.rule_id, { outcome: r.outcome, created_at: r.created_at });
      }
    });

    // --- Build response structure ---
    const mapped = controls.map((c: any) => {
      const controlRules = (rules || [])
        .filter(r => r.control_id === c.id)
        .map(r => {
          const lastResult = latestResultMap.get(r.id);
          return {
            id: r.id,
            code: r.code,
            title: r.title,
            severity: r.severity,
            last_outcome: lastResult?.outcome || null,
            last_at: lastResult?.created_at || null
          };
        });

      // Apply withRulesOnly filter
      if (withRulesOnly && controlRules.length === 0) {
        return null;
      }

      return {
        control: { id: c.id, code: c.code, title: c.title },
        rules: controlRules
      };
    }).filter(Boolean);

    return new Response(JSON.stringify({
      items: mapped,
      pagination: {
        page,
        pageSize: cappedPageSize,
        total: count || mapped.length,
        totalPages: Math.ceil((count || mapped.length) / cappedPageSize)
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('[list-control-mapping]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
