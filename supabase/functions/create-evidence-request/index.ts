import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { buildCorsHeaders, json as jsonResponse } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';
import { assertOrigin, requireUserAndTenant } from '../_shared/access.ts';

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

    let payload: { control_id?: string; title?: string; description?: string; due_at?: string | null };
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, req);
    }

    const { control_id, title, description, due_at } = payload ?? {};
    if (!control_id || !title) {
      return json({ error: 'Missing fields: control_id, title' }, 400, req);
    }

    // Verify control exists
    const { data: ctrl } = await sbAdmin
      .from('controls')
      .select('id')
      .eq('id', control_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!ctrl) {
      return json({ error: 'Control not found' }, 404, req);
    }

    console.log('[create-evidence-request]', { tenantId, control_id, title });

    const { data, error } = await sbAdmin
      .from('evidence_requests')
      .insert({
        tenant_id: tenantId,
        control_id,
        title,
        description: description ?? null,
        due_at: due_at ?? null,
        requested_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[create-evidence-request] Created', data.id);

    // Audit log
    await logEvent(sbAdmin, {
      tenant_id: tenantId,
      actor_id: userId,
      action: 'evidence_request.create',
      entity: 'evidence_request',
      entity_id: data.id,
      payload: { control_id, title },
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
    });

    return json(data, 201, req);
  } catch (e: any) {
    console.error('[create-evidence-request]', e);
    return json({ error: e.message ?? 'Internal error' }, 500, req);
  }
});
