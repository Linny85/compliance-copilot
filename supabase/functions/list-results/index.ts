import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const sb = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await sb
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

    const body = await req.json().catch(() => ({}));
    const page = Number.isFinite(Number(body.page)) ? Number(body.page) : 1;
    const pageSize = Number.isFinite(Number(body.pageSize)) ? Number(body.pageSize) : 50;
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(200, Math.max(1, pageSize));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    // Extract filters
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

    console.log('[list-results]', { tenant_id, page: safePage, pageSize: safePageSize, filters });

    // Build query with filters (RLS-safe via auth client)
    let query = sb
      .from('check_results')
      .select(`
        id, 
        run_id, 
        outcome, 
        message, 
        created_at,
        check_runs!inner(id, status, window_start, window_end),
        check_rules!inner(id, code, title, severity, control_id, deleted_at)
      `, { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .is('check_rules.deleted_at', null);

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

    // Severity filter (via joined check_rules)
    if (Array.isArray(severity) && severity.length > 0) {
      query = query.in('check_rules.severity', severity);
    }

    // Status filter (via joined check_runs)
    if (Array.isArray(status) && status.length > 0) {
      query = query.in('check_runs.status', status);
    }

    // Control filter
    if (control_id) {
      query = query.eq('check_rules.control_id', control_id);
    }

    // Text search (code or title)
    if (q && q.trim().length >= 2) {
      const qClean = q.trim().replaceAll('%', '').replaceAll('_', '');
      query = query.or(`(check_rules.code.ilike.%${qClean}%,check_rules.title.ilike.%${qClean}%)`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        results: data,
        pagination: {
          page: safePage,
          pageSize: safePageSize,
          total: count,
          totalPages: Math.ceil((count || 0) / safePageSize),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[list-results]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
