import { requireRole, supabaseAdmin, verifyEditToken } from "@shared/utils/security.ts";
import { auditEvent } from "@shared/utils/audit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-org-edit',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const base = requireRole(req, "manager");
    if (base instanceof Response) return base;
    const { tenantId, userId } = base;

    const edit = req.headers.get("x-org-edit");
    if (!edit) {
      return new Response(JSON.stringify({ error: "edit_token_required" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = await verifyEditToken(edit);
    if (!payload || payload.scope !== "org:edit" || payload.tenantId !== tenantId) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check token version
    const { data: secret } = await supabaseAdmin
      .from("org_secrets")
      .select("version")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!secret) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (secret.version !== payload.v) {
      return new Response(JSON.stringify({ error: 'stale_token', message: 'Token expired due to password rotation' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const allowed = ["name","legal_name","street","zip","city","country","sector","company_size","website","vat_id"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    
    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: "no_changes" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabaseAdmin
      .from("Unternehmen")
      .update(patch)
      .eq("id", tenantId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await auditEvent({ tenantId, userId, event: "org.update", details: patch });
    
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (error) {
    console.error('Update organization error:', error);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
