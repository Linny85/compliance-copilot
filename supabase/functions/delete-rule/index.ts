import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BodySchema = z.object({
  id: z.string().uuid(),
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

    // Get tenant
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

    // Soft-delete rule (only if belongs to tenant)
    const { error: delErr } = await sb
      .from('check_rules')
      .update({ deleted_at: new Date().toISOString(), enabled: false })
      .eq('tenant_id', tenant_id)
      .eq('id', body.id);

    if (delErr) {
      console.error('[delete-rule] Error:', delErr);
      return new Response(
        JSON.stringify({ error: 'DELETE_FAILED', details: (delErr as any)?.message || String(delErr) }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Audit log
    await logEvent(sb, {
      tenant_id,
      actor_id: user.id,
      action: 'delete',
      entity: 'check_rule',
      entity_id: body.id,
      payload: { id: body.id },
    }).catch(e => console.error('[delete-rule] audit error:', e));

    console.log('[delete-rule] Soft-deleted rule', body.id, 'for tenant', tenant_id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[delete-rule] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Invalid request';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
