import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { buildCorsHeaders, json as jsonResponse } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';
import { assertOrigin, requireUserAndTenant } from '../_shared/access.ts';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200, req?: Request) {
  return jsonResponse(body, status, req);
}

Deno.serve(async (req) => {
  const originCheck = assertOrigin(req);
  if (originCheck) return originCheck;
  const cors = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, 405, req);
    }

    const access = requireUserAndTenant(req);
    if (access instanceof Response) return access;
    const { userId, tenantId } = access;

    let payload: {
      request_id?: string;
      control_id?: string;
      file_path?: string;
      file_size?: number;
      mime_type?: string;
      hash_sha256?: string;
    };

    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, req);
    }

    const { request_id, control_id, file_path, file_size, mime_type, hash_sha256 } = payload ?? {};

    if (!control_id || !file_path || !file_size || !hash_sha256) {
      return json({ error: 'Missing fields: control_id, file_path, file_size, hash_sha256' }, 400, req);
    }

    // Validate file size
    if (file_size > MAX_FILE_SIZE) {
      return json({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)} MB` }, 400, req);
    }

    // Validate path format (must start with evidence/<tenant_id>/)
    const tenantPrefix = `evidence/${tenantId}/`;
    if (!file_path.startsWith(tenantPrefix)) {
      return json({ error: 'Invalid file path format' }, 400, req);
    }

    // Ensure control belongs to tenant
    const { data: control } = await sbAdmin
      .from('controls')
      .select('id')
      .eq('id', control_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!control) {
      return json({ error: 'Control not found' }, 404, req);
    }

    console.log('[submit-evidence]', { tenantId, control_id, file_path, hash_sha256 });

    // Insert evidence (append only) - handle duplicates idempotently
    let ev;
    const { data: inserted, error } = await sbAdmin
      .from('evidences')
      .insert({
        tenant_id: tenantId,
        request_id: request_id ?? null,
        control_id,
        file_path,
        file_size,
        mime_type: mime_type ?? null,
        hash_sha256,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate hash (unique constraint violation)
      if (error.code === '23505') {
        console.log('[submit-evidence] Duplicate hash detected, returning existing record');
        const { data: existing } = await sbAdmin
          .from('evidences')
          .select()
          .eq('tenant_id', tenantId)
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
    await logEvent(sbAdmin, {
      tenant_id: tenantId,
      actor_id: userId,
      action: 'evidence.submit',
      entity: 'evidence',
      entity_id: ev.id,
      payload: { control_id, file_size, hash_sha256 },
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

    // Auto-fulfill request if provided
    if (request_id) {
      const { error: updateError } = await sbAdmin
        .from('evidence_requests')
        .update({ status: 'fulfilled' })
        .eq('id', request_id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.warn('[submit-evidence] Failed to update request status:', updateError);
      } else {
        console.log('[submit-evidence] Fulfilled request', request_id);
      }
    }

    return json(ev, 201, req);
  } catch (e: any) {
    console.error('[submit-evidence]', e);
    return json({ error: e.message ?? 'Internal error' }, 500, req);
  }
});
