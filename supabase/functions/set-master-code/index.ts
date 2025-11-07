import { requireRole, hashMaster, supabaseAdmin } from "@shared/utils/security.ts";
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
    const base = requireRole(req, "admin");
    if (base instanceof Response) return base;
    const { tenantId, userId } = base;

    const { master } = await req.json().catch(() => ({}));
    if (typeof master !== "string" || master.trim().length < 10) {
      return new Response(JSON.stringify({ error: "weak_password" }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const master_hash = await hashMaster(master.trim());
    
    // Check if secret already exists to determine if this is initial setup or rotation
    const { data: existing } = await supabaseAdmin
      .from("org_secrets")
      .select("version")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const nextVersion = existing ? (existing.version || 1) + 1 : 1;
    
    const { error } = await supabaseAdmin
      .from("org_secrets")
      .upsert({ 
        tenant_id: tenantId, 
        master_hash, 
        version: nextVersion,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
        updated_by: userId
      }, { onConflict: "tenant_id" });

    if (error) {
      console.error('DB error setting master code:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await auditEvent({ 
      tenantId, 
      userId, 
      event: existing ? "master.rotate" : "master.set", 
      details: { version: nextVersion } 
    });
    
    return new Response(JSON.stringify({ ok: true, version: nextVersion }), { 
      status: 200, 
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  } catch (error) {
    console.error('Set master code error:', error);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
