import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

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

    // Validate file size
    if (file_size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)} MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate path format (must start with evidence/<tenant_id>/)
    if (!file_path.startsWith('evidence/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid file path format' }),
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

    // Insert evidence (append only) - handle duplicates idempotently
    let ev;
    const { data: inserted, error } = await sb
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

    if (error) {
      // Handle duplicate hash (unique constraint violation)
      if (error.code === '23505') {
        console.log('[submit-evidence] Duplicate hash detected, returning existing record');
        const { data: existing } = await sb
          .from('evidences')
          .select()
          .eq('tenant_id', tenant_id)
          .eq('hash_sha256', hash_sha256)
          .single();
        
        if (existing) {
          ev = existing;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    } else {
      ev = inserted;
    }

    console.log('[submit-evidence] Created/Retrieved', ev.id);

    // Audit log
    await logEvent(sb, {
      tenant_id,
      actor_id: user.id,
      action: 'evidence.submit',
      entity: 'evidence',
      entity_id: ev.id,
      payload: { control_id, file_size, hash_sha256 },
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

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
