import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';

    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Accept both querystring and JSON body
    const body = await req.json().catch(() => ({}));
    const frameworkCode = url.searchParams.get('framework') ?? body.framework ?? undefined;
    const severity      = url.searchParams.get('severity')  ?? body.severity  ?? undefined;
    const page          = parseInt(url.searchParams.get('page')     ?? body.page     ?? '1', 10);
    const pageSize      = parseInt(url.searchParams.get('pageSize') ?? body.pageSize ?? '50', 10);

    console.log('[list-controls] params', { frameworkCode, severity, page, pageSize });

    // Build base query
    let q = sb
      .from('controls')
      .select(`
        id, code, title, objective, severity, evidence_types, framework_id,
        frameworks:frameworks ( code, title, version )
      `, { count: 'exact' });

    // Filter by framework code
    if (frameworkCode) {
      const { data: fw, error: fwErr } = await sb
        .from('frameworks')
        .select('id')
        .eq('code', frameworkCode)
        .maybeSingle();
      if (fwErr) console.warn('[list-controls] frameworks lookup warn:', fwErr.message);
      if (fw?.id) q = q.eq('framework_id', fw.id);
    }

    if (severity) q = q.eq('severity', severity);

    // Order + pagination
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;
    const { data, error, count } = await q.order('code', { ascending: true }).range(from, to);

    if (error) throw error;

    // Fallback map if join didn't hydrate (rare)
    let controls = data ?? [];
    const needFrameworks = controls.some((c: any) => !c.frameworks && c.framework_id);
    if (needFrameworks) {
      const ids = [...new Set(controls.map((c: any) => c.framework_id).filter(Boolean))];
      if (ids.length) {
        const { data: fwMulti } = await sb.from('frameworks')
          .select('id, code, title, version')
          .in('id', ids);
        const map = new Map(fwMulti?.map(f => [f.id, f]) ?? []);
        controls = controls.map((c: any) => ({ ...c, frameworks: map.get(c.framework_id) ?? null }));
      }
    }

    return new Response(JSON.stringify({
      controls,
      pagination: {
        page, pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize)
      }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (e: any) {
    console.error('[list-controls] error', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});
