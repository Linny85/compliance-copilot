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

    const { control_id, unit_id, status, note } = await req.json();

    if (!control_id || !unit_id) {
      return new Response(
        JSON.stringify({ error: 'Missing fields: control_id, unit_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status enum
    const allowedStatus = ['in_scope', 'out_of_scope', 'exception'];
    if (status && !allowedStatus.includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be one of: in_scope, out_of_scope, exception' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log('[assign-control]', { tenant_id, control_id, unit_id, status });

    // Idempotent upsert
    const { data: existing } = await sb
      .from('scope_assignments')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('control_id', control_id)
      .eq('unit_id', unit_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await sb
        .from('scope_assignments')
        .update({ status: status ?? 'in_scope', note: note ?? null })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('[assign-control] Updated', result.id);
    } else {
      const { data, error } = await sb
        .from('scope_assignments')
        .insert({
          tenant_id,
          control_id,
          unit_id,
          status: status ?? 'in_scope',
          note: note ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('[assign-control] Created', result.id);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[assign-control] error', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
