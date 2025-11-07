import { requireAuth, supabaseAdmin, hashMaster } from "@shared/utils/security.ts";
import { auditEvent } from "@shared/utils/audit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILS = 5;
const LOCK_MIN = 15;

// SHA-256 hex digest helper
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return hex(digest);
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const base = requireAuth(req);
    if (base instanceof Response) return base;
    const { tenantId, userId } = base;

    const { master } = await req.json().catch(() => ({}));
    if (typeof master !== "string" || master.length < 1) {
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
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check lockout
    if (secret.locked_until && new Date(secret.locked_until) > new Date()) {
      await auditEvent({ tenantId, userId, event: "master.verify.fail", details: { reason: "locked" } });
      return new Response(JSON.stringify({ ok: false, error: 'locked', locked_until: secret.locked_until }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Compute hash with constant-time comparison
    const inputHash = await hashMaster(master);
    const ok = constantTimeCompare(inputHash, secret.master_hash);

    if (!ok) {
      const fails = (secret.failed_attempts ?? 0) + 1;
      const lock = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60 * 1000).toISOString() : null;
      
      await supabaseAdmin.from("org_secrets").update({
        failed_attempts: fails,
        locked_until: lock,
        updated_at: new Date().toISOString()
      }).eq("tenant_id", tenantId);

      if (lock) {
        await auditEvent({ tenantId, userId, event: "master.locked", details: { attempts: fails } });
      } else {
        await auditEvent({ tenantId, userId, event: "master.verify.fail", details: { attempts: fails } });
      }
      
      return new Response(JSON.stringify({ 
        ok: false,
        error: fails >= MAX_FAILS ? 'locked' : 'invalid',
        attempts_remaining: Math.max(0, MAX_FAILS - fails)
      }), {
        status: 200,
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

    return new Response(JSON.stringify({ ok: true, version: secret.version }), {
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
