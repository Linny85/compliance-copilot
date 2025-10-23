import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

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

  const authHeader = (req.headers.get('Authorization') || '').trim();
  const sbAuth = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // Auth check (controls are tenant-scoped; user must be authenticated)
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve tenant via profile
    const { data: profile, error: pErr } = await sbAuth
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const tenant_id = profile?.company_id as string | undefined;
    if (pErr || !tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));

    // If a specific id is provided, return that control directly (tenant-scoped)
    if (body.id) {
      const { data: one, error: oneErr } = await sbAuth
        .from('controls')
        .select('id, code, title')
        .eq('tenant_id', tenant_id)
        .eq('id', body.id)
        .maybeSingle();

      if (oneErr) throw oneErr;

      return new Response(JSON.stringify({
        items: one ? [one] : [],
        pagination: { page: 1, pageSize: 1, total: one ? 1 : 0, totalPages: 1 }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const qRaw = (body.q || '').toString().trim();
    const q = qRaw.replaceAll('%', '').replaceAll('_', ''); // sanitize wildcards
    const page = Number.isFinite(Number(body.page)) ? Number(body.page) : 1;
    const pageSizeRaw = Number.isFinite(Number(body.pageSize)) ? Number(body.pageSize) : 20;
    const pageSize = Math.min(50, Math.max(1, pageSizeRaw));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Search controls (tenant-scoped)
    let query = sbAuth
      .from('controls')
      .select('id, code, title', { count: 'exact' })
      .eq('tenant_id', tenant_id);

    if (q) {
      // ILIKE search on code/title
      query = query.or(`code.ilike.%${q}%,title.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('code', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('[search-controls] Query error:', error);
      throw error;
    }

    return new Response(JSON.stringify({
      items: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('[search-controls] Error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
