import { corsHeaders } from "../_shared/cors.ts";
import { getLovableBaseUrl, lovableFetch } from "../_shared/lovableClient.ts";
import { logInfo, logError } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const t0 = performance.now();
  let status = 200;
  let body: any;

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

    body = {
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
    };

    // Strukturiertes Logging
    await logInfo({
      func: "helpbot-health",
      message: "health check completed",
      tenant_id,
      session_id,
      using_proxy: usingProxy,
      base_url: base,
      path: "/embeddings",
      method: "POST",
      status,
      latency_ms: Math.round(performance.now() - t0),
      error_code: pingError ? "DEGRADED_OR_DOWN" : null,
      details: { pingStatus, pingError }
    });

    return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }});

  } catch (e: any) {
    status = 500;
    const errMsg = String(e);
    body = { ok: false, error: errMsg, ts: new Date().toISOString() };

    await logError({
      func: "helpbot-health",
      message: "unhandled exception",
      status,
      latency_ms: Math.round(performance.now() - t0),
      error_code: "UNHANDLED",
      details: { error: errMsg }
    });

    console.error('[helpbot-health] Error:', e);
    return new Response(JSON.stringify(body), {
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
