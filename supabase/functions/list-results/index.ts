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
    const page = Number(body.page ?? 1);
    const pageSize = Number(body.pageSize ?? 50);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log('[list-results]', { tenant_id, page, pageSize });

    const { data, error, count } = await sb
      .from('check_results')
      .select('*, check_runs!inner(status, window_start, window_end), check_rules!inner(code, title, severity, control_id)', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        results: data,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil((count || 0) / pageSize),
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
