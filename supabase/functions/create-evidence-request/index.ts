import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const sbAuth = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const sb = createClient(url, service);

    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { control_id, title, description, due_at } = await req.json();
    if (!control_id || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing fields: control_id, title' }),
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

    // Verify control exists
    const { data: ctrl } = await sb
      .from('controls')
      .select('id')
      .eq('id', control_id)
      .maybeSingle();

    if (!ctrl) {
      return new Response(
        JSON.stringify({ error: 'Control not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-evidence-request]', { tenant_id, control_id, title });

    const { data, error } = await sb
      .from('evidence_requests')
      .insert({
        tenant_id,
        control_id,
        title,
        description: description ?? null,
        due_at: due_at ?? null,
        requested_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[create-evidence-request] Created', data.id);

    // Audit log
    await logEvent(sb, {
      tenant_id,
      actor_id: user.id,
      action: 'evidence_request.create',
      entity: 'evidence_request',
      entity_id: data.id,
      payload: { control_id, title },
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

    return new Response(
      JSON.stringify(data),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[create-evidence-request]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
