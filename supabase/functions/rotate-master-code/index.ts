import { requireRole, supabaseAdmin, verifyMaster, hashMaster } from "@shared/utils/security.ts";
import { auditEvent } from "@shared/utils/audit.ts";

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
    const base = requireRole(req, "admin");
    if (base instanceof Response) return base;
    const { tenantId, userId } = base;

    const { oldPassword, newPassword } = await req.json().catch(() => ({}));
    
    if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
      return new Response(JSON.stringify({ error: 'bad_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 10) {
      return new Response(JSON.stringify({ error: 'weak_password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: secret } = await supabaseAdmin
      .from("org_secrets")
      .select("master_hash, version, failed_attempts, locked_until")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!secret?.master_hash) {
      return new Response(JSON.stringify({ error: 'master_not_set' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check lockout
    if (secret.locked_until && new Date(secret.locked_until) > new Date()) {
      return new Response(JSON.stringify({ error: 'locked', locked_until: secret.locked_until }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify old password
    const ok = await verifyMaster(secret.master_hash, oldPassword);

    if (!ok) {
      const fails = (secret.failed_attempts ?? 0) + 1;
      const lock = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60 * 1000).toISOString() : null;
      
      await supabaseAdmin.from("org_secrets").update({
        failed_attempts: fails,
        locked_until: lock,
        updated_at: new Date().toISOString()
      }).eq("tenant_id", tenantId);

      await auditEvent({ tenantId, userId, event: "master.verify.fail", details: { context: 'rotation', fails } });
      
      return new Response(JSON.stringify({ 
        error: 'invalid_old_password',
        attempts_remaining: MAX_FAILS - fails 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Hash new password
    const newHash = await hashMaster(newPassword);

    // Update with version increment (invalidates all edit tokens)
    const { error } = await supabaseAdmin.from("org_secrets").update({
      master_hash: newHash,
      version: (secret.version ?? 1) + 1,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString()
    }).eq("tenant_id", tenantId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await auditEvent({ tenantId, userId, event: "master.set", details: { action: 'rotation', version: (secret.version ?? 1) + 1 } });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Rotate master code error:', error);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
