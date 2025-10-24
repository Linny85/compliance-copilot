import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenant_id = profile.company_id;
    
    // Support both query params and body params
    const url = new URL(req.url);
    const qp = Object.fromEntries(url.searchParams.entries());
    const bodyParams = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const params = { ...qp, ...bodyParams };
    
    const status = params.status;
    const risk = params.risk;
    const search = params.search;
    const scope = params.scope; // 'process' or 'vendor'
    const scope_id = params.scope_id;
    const page = parseInt(params.page || '1', 10);
    const limit = parseInt(params.limit || '50', 10);
    const offset = (page - 1) * limit;

    let query = supabaseClient
      .from('v_dpia_overview')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id);

    if (status) query = query.eq('status', status);
    if (risk) query = query.eq('risk_level', risk);
    if (search) query = query.ilike('title', `%${search}%`);
    if (scope === 'process' && scope_id) query = query.eq('process_id', scope_id);
    if (scope === 'vendor' && scope_id) query = query.eq('vendor_id', scope_id);

    const { data: items, error: selectError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (selectError) {
      console.error('[dpia-list] Select error:', selectError);
      return new Response(JSON.stringify({ error: selectError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ items: items || [], total: count || 0, page, limit }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[dpia-list] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
