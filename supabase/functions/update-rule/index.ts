import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BodySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  kind: z.enum(['static', 'query']).optional(),
  enabled: z.boolean().optional(),
  control_id: z.string().uuid().nullable().optional(),
  code: z.string().regex(/^[a-z0-9-_:.]+$/i).min(2).max(64).optional(),
  spec: z.any().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = (req.headers.get('Authorization') || '').trim();
  const sbAuth = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const sb = createClient(url, service);

  try {
    const raw = await req.json().catch(() => ({}));
    const body = BodySchema.parse(raw);

    // Auth
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tenant + rule fetch
    const { data: profile } = await sb
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const tenant_id = profile?.company_id as string | undefined;
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin check
    const { data: roles } = await sb
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', tenant_id)
      .in('role', ['admin', 'master_admin']);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'FORBIDDEN_ADMIN_ONLY' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing, error: exErr } = await sb
      .from('check_rules')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('id', body.id)
      .maybeSingle();

    if (exErr || !existing) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate spec if provided / or if kind changes
    const nextKind = (body.kind ?? existing.kind) as 'static' | 'query';
    let nextSpec = body.spec ?? existing.spec;

    if (nextKind === 'static') {
      const StaticSpec = z.object({
        metric: z.string().min(1),
        value: z.number(),
        op: z.enum(['<', '<=', '>', '>=', '==']).default('<='),
        threshold: z.number(),
      });
      nextSpec = StaticSpec.parse(nextSpec);
    } else {
      const QuerySpec = z.object({
        table: z.string().min(1).optional().default('evidences'),
        threshold: z.number().int().nonnegative().default(1),
      });
      nextSpec = QuerySpec.parse(nextSpec);
    }

    const updatePayload: Record<string, any> = {};
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.severity !== undefined) updatePayload.severity = body.severity;
    if (body.enabled !== undefined) updatePayload.enabled = body.enabled;
    if (body.control_id !== undefined) updatePayload.control_id = body.control_id;
    if (body.code !== undefined) updatePayload.code = body.code;

    // If kind or spec touched or kind different from existing → write both
    if (body.kind !== undefined || body.spec !== undefined || existing.kind !== nextKind) {
      updatePayload.kind = nextKind;
      updatePayload.spec = nextSpec;
    }

    const { data: rule, error: upErr } = await sb
      .from('check_rules')
      .update(updatePayload)
      .eq('tenant_id', tenant_id)
      .eq('id', body.id)
      .select('id, tenant_id, title, code, severity, kind, enabled, control_id, spec')
      .single();

    if (upErr) {
      const msg = (upErr as any)?.message || String(upErr);
      const conflict = /duplicate key|unique constraint/i.test(msg);
      return new Response(
        JSON.stringify({ error: conflict ? 'DUPLICATE_CODE' : 'UPDATE_FAILED', details: msg }),
        {
          status: conflict ? 409 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Audit log
    await logEvent(sb, {
      tenant_id,
      actor_id: user.id,
      action: 'update',
      entity: 'check_rule',
      entity_id: rule.id,
      payload: updatePayload,
    }).catch(e => console.error('[update-rule] audit error:', e));

    console.log('[update-rule] Updated rule', rule.id, 'for tenant', tenant_id);
    return new Response(JSON.stringify({ rule }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[update-rule] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Invalid request';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
