import { corsHeaders } from "../_shared/cors.ts";
import { getLovableBaseUrl, lovableFetch } from "../_shared/lovableClient.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const { tenant_id, session_id } = await req.json().catch(() => ({ tenant_id: "demo", session_id: "healthcheck" }));
    
    const base = getLovableBaseUrl();
    const proxyUrl = Deno.env.get('PROXY_URL')?.trim();
    const usingProxy = !!proxyUrl;

    // Simple ping test via proxy or direct
    let pingStatus = "unknown";
    let pingError = null;
    
    try {
      // Try a minimal embeddings call as health check
      const embRes = await lovableFetch("/embeddings", {
        method: "POST",
        body: JSON.stringify({
          model: Deno.env.get("EMB_MODEL") ?? "text-embedding-3-small",
          input: "health-check"
        }),
      });
      
      if (embRes.ok) {
        pingStatus = "up";
      } else {
        pingStatus = "degraded";
        pingError = `HTTP ${embRes.status}`;
      }
    } catch (e) {
      pingStatus = "down";
      pingError = String(e);
    }

    return new Response(JSON.stringify({
      ok: true,
      pong: {
        status: pingStatus,
        error: pingError,
        base,
        usingProxy,
        tenant_id,
        session_id,
        ts: new Date().toISOString()
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (e: any) {
    console.error('[helpbot-health] Error:', e);
    return new Response(JSON.stringify({ 
      ok: false,
      error: String(e), 
      ts: new Date().toISOString()
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
