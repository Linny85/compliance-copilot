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

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const sbAuth = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

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

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'No tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant_id = profile.company_id;

    // Admin check
    const { data: roleProfile, error: roleErr } = await sbAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (roleErr || roleProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'FORBIDDEN_ADMIN_ONLY' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const filters = body.filters || {};
    const { 
      from: dateFrom, 
      to: dateTo, 
      severity = [], 
      outcome = [], 
      status = [], 
      control_id, 
      q 
    } = filters;

    console.log('[export-results]', { tenant_id, filters });

    // Build query with filters (same as list-results)
    let query = sbAuth
      .from('check_results')
      .select(`
        id, 
        run_id, 
        outcome, 
        message, 
        created_at,
        check_runs!inner(id, status, window_start, window_end),
        check_rules!inner(id, code, title, severity, control_id),
        controls(code, title)
      `)
      .eq('tenant_id', tenant_id);

    // Date range filter
    if (dateFrom) {
      try {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          query = query.gte('created_at', fromDate.toISOString());
        }
      } catch {}
    }
    if (dateTo) {
      try {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', toDate.toISOString());
        }
      } catch {}
    }

    // Outcome filter
    if (Array.isArray(outcome) && outcome.length > 0) {
      query = query.in('outcome', outcome);
    }

    // Severity filter
    if (Array.isArray(severity) && severity.length > 0) {
      query = query.in('check_rules.severity', severity);
    }

    // Status filter
    if (Array.isArray(status) && status.length > 0) {
      query = query.in('check_runs.status', status);
    }

    // Control filter
    if (control_id) {
      query = query.eq('check_rules.control_id', control_id);
    }

    // Text search
    if (q && q.trim().length >= 2) {
      const qClean = q.trim().replaceAll('%', '').replaceAll('_', '');
      query = query.or(`check_rules.code.ilike.%${qClean}%,check_rules.title.ilike.%${qClean}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) throw error;

    // Build CSV
    const csvHeader = [
      'timestamp',
      'rule_code',
      'rule_title',
      'severity',
      'outcome',
      'run_status',
      'message',
      'control_code',
      'control_title',
      'window_start',
      'window_end',
      'run_id'
    ].join(',');

    const csvRows = (data || []).map((r: any) => {
      const rule = r.check_rules;
      const run = r.check_runs;
      const control = r.controls;
      
      return [
        r.created_at,
        rule?.code || '',
        `"${(rule?.title || '').replaceAll('"', '""')}"`,
        rule?.severity || '',
        r.outcome,
        run?.status || '',
        `"${(r.message || '').replaceAll('"', '""')}"`,
        control?.code || '',
        `"${(control?.title || '').replaceAll('"', '""')}"`,
        run?.window_start || '',
        run?.window_end || '',
        r.run_id
      ].join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');

    // Add UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="check_results_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (e: any) {
    console.error('[export-results]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
