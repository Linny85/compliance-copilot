import { requireAuth, supabaseAdmin, verifyMaster, rateLimit, signEditToken } from "@shared/utils/security.ts";
import { auditEvent } from "@shared/utils/audit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .select("master_hash, version")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!secret?.master_hash) {
      return new Response(JSON.stringify({ ok: false, error: "not_set" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ok = await verifyMaster(secret.master_hash, master);
    await auditEvent({ tenantId, userId, event: ok ? "master.verify.ok" : "master.verify.fail" });

    if (!ok) {
      return new Response(JSON.stringify({ ok: false, error: "invalid" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
