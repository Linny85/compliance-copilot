import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const sbAuth = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: auth } },
    });
    const sb = createClient(supabaseUrl, service);

    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { kind, name, owner_id } = body;

    if (!kind || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing fields: kind, name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve tenant
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

    console.log('[upsert-scope-unit]', { tenant_id, kind, name });

    // Idempotent upsert by (tenant, kind, name)
    const { data: existing } = await sb
      .from('scope_units')
      .select('id, name, kind, owner_id')
      .eq('tenant_id', tenant_id)
      .eq('kind', kind)
      .eq('name', name)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await sb
        .from('scope_units')
        .update({ owner_id: owner_id ?? existing.owner_id })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('[upsert-scope-unit] Updated', result.id);
    } else {
      const { data, error } = await sb
        .from('scope_units')
        .insert({
          tenant_id,
          kind,
          name,
          owner_id: owner_id ?? user.id,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('[upsert-scope-unit] Created', result.id);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[upsert-scope-unit] error', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
