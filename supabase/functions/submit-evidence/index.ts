import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

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

    const { request_id, control_id, file_path, file_size, mime_type, hash_sha256 } = await req.json();

    if (!control_id || !file_path || !file_size || !hash_sha256) {
      return new Response(
        JSON.stringify({ error: 'Missing fields: control_id, file_path, file_size, hash_sha256' }),
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

    console.log('[submit-evidence]', { tenant_id, control_id, file_path, hash_sha256 });

    // Insert evidence (append only)
    const { data: ev, error } = await sb
      .from('evidences')
      .insert({
        tenant_id,
        request_id: request_id ?? null,
        control_id,
        file_path,
        file_size,
        mime_type: mime_type ?? null,
        hash_sha256,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[submit-evidence] Created', ev.id);

    // Auto-fulfill request if provided
    if (request_id) {
      const { error: updateError } = await sb
        .from('evidence_requests')
        .update({ status: 'fulfilled' })
        .eq('id', request_id)
        .eq('tenant_id', tenant_id);

      if (updateError) {
        console.warn('[submit-evidence] Failed to update request status:', updateError);
      } else {
        console.log('[submit-evidence] Fulfilled request', request_id);
      }
    }

    return new Response(
      JSON.stringify(ev),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[submit-evidence]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
