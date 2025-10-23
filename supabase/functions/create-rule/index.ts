import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BodySchema = z.object({
  title: z.string().min(3).max(200),
  code: z.string().regex(/^[a-z0-9-_:.]+$/i).min(2).max(64),
  description: z.string().max(1000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  kind: z.enum(['static', 'query']),
  enabled: z.boolean().optional().default(true),
  control_id: z.string().uuid().optional(),
  spec: z.any(),
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

    // 1) Auth only via JWT (no service shortcut here, rule creation is a user action)
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Get tenant
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (pErr || !profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const tenant_id = profile.company_id as string;

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

    // 3) Validate spec based on kind
    if (body.kind === 'static') {
      const StaticSpec = z.object({
        metric: z.string().min(1),
        value: z.number(),
        op: z.enum(['<', '<=', '>', '>=', '==']).default('<='),
        threshold: z.number(),
      });
      body.spec = StaticSpec.parse(body.spec);
    } else if (body.kind === 'query') {
      const QuerySpec = z.object({
        table: z.string().min(1).optional().default('evidences'),
        threshold: z.number().int().nonnegative().default(1),
      });
      body.spec = QuerySpec.parse(body.spec);
    }

    // 4) Insert
    const insertPayload = {
      tenant_id,
      created_by: user.id,
      title: body.title,
      code: body.code,
      description: body.description ?? null,
      severity: body.severity,
      kind: body.kind,
      enabled: body.enabled,
      control_id: body.control_id ?? null,
      spec: body.spec,
    };

    const { data: rule, error: insErr } = await sb
      .from('check_rules')
      .insert(insertPayload)
      .select('id, tenant_id, title, code, severity, kind, enabled, control_id, spec')
      .single();

    if (insErr) {
      // Map unique constraint cleanly
      const msg = (insErr as any)?.message || String(insErr);
      const conflict = /duplicate key|unique constraint/i.test(msg);
      return new Response(
        JSON.stringify({ error: conflict ? 'DUPLICATE_CODE' : 'INSERT_FAILED', details: msg }),
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
      action: 'create',
      entity: 'check_rule',
      entity_id: rule.id,
      payload: { code: rule.code, title: rule.title, severity: rule.severity },
    }).catch(e => console.error('[create-rule] audit error:', e));

    console.log('[create-rule] Created rule', rule.id, 'for tenant', tenant_id);
    return new Response(JSON.stringify({ rule }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[create-rule] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Invalid request';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
