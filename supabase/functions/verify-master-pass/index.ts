import { requireAuth, supabaseAdmin, verifyMaster, rateLimit, signEditToken } from "../_shared/utils/security.ts";
import { auditEvent } from "../_shared/utils/audit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILS = 5;
const LOCK_MIN = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const base = requireAuth(req);
    if (base instanceof Response) return base;
    const { tenantId, userId } = base;

    const okRL = await rateLimit(`${tenantId}:${userId}:verify`, 5, 900);
    if (!okRL) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { master } = await req.json().catch(() => ({}));
    if (typeof master !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: secret } = await supabaseAdmin
      .from("org_secrets")
      .select("master_hash, version, failed_attempts, locked_until")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!secret?.master_hash) {
      return new Response(JSON.stringify({ ok: false, error: "not_set" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check lockout
    if (secret.locked_until && new Date(secret.locked_until) > new Date()) {
      return new Response(JSON.stringify({ ok: false, error: 'locked', locked_until: secret.locked_until }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ok = await verifyMaster(secret.master_hash, master);

    if (!ok) {
      const fails = (secret.failed_attempts ?? 0) + 1;
      const lock = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60 * 1000).toISOString() : null;
      
      await supabaseAdmin.from("org_secrets").update({
        failed_attempts: fails,
        locked_until: lock,
        updated_at: new Date().toISOString()
      }).eq("tenant_id", tenantId);

      await auditEvent({ tenantId, userId, event: "master.verify.fail", details: { fails } });
      
      return new Response(JSON.stringify({ 
        ok: false,
        error: 'invalid',
        attempts_remaining: MAX_FAILS - fails 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Success - reset counters
    await supabaseAdmin.from("org_secrets").update({
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString()
    }).eq("tenant_id", tenantId);

    await auditEvent({ tenantId, userId, event: "master.verify.ok" });

    const token = await signEditToken({ tenantId, scope: "org:edit", v: secret.version }, 600);
    return new Response(JSON.stringify({ ok: true, editToken: token, ttl: 600 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Verify master password error:', error);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
