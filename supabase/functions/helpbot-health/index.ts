import { corsHeaders } from "../_shared/cors.ts";
import { getLovableBaseUrl, lovableFetch } from "../_shared/lovableClient.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const base = getLovableBaseUrl();
    const key = (Deno.env.get("LOVABLE_API_KEY") ?? "").trim();
    const keySet = key.length > 0;

    // 0) DNS resolution from Edge Runtime
    let dns: any = { a: [], aaaa: [], err: null };
    try {
      dns.a = await Deno.resolveDns(new URL(base).hostname, "A");
      try { dns.aaaa = await Deno.resolveDns(new URL(base).hostname, "AAAA"); } catch { dns.aaaa = []; }
    } catch (e) { dns.err = String(e); }

    // 1) TLS/Reachability via HEAD
    let tlsOk = true, tlsStatus = 0, tlsBody = "";
    try {
      const headRes = await fetch(base, { method: "HEAD" });
      tlsStatus = headRes.status;
      tlsBody = `${headRes.status} ${headRes.statusText}`;
    } catch (e) {
      tlsOk = false;
      tlsBody = String(e);
    }

    // 2) /models endpoint (if available)
    let modelsStatus = 0, modelsBody = "";
    try {
      const mRes = await lovableFetch("/models", {
        method: "GET",
        headers: { "Accept": "application/json", "Connection": "close" }
      });
      modelsStatus = mRes.status;
      modelsBody = (await mRes.text()).slice(0, 600);
    } catch (e) {
      modelsStatus = -1;
      modelsBody = String(e);
    }

    // 3) Minimal embedding test (without dimensions)
    let embStatus = 0, embBody = "";
    try {
      const embRes = await lovableFetch("/embeddings", {
        method: "POST",
        headers: { "Accept": "application/json", "Connection": "close" },
        body: JSON.stringify({
          model: Deno.env.get("EMB_MODEL") ?? "text-embedding-3-small",
          input: "health-check"
        }),
      });
      embStatus = embRes.status;
      embBody = (await embRes.text()).slice(0, 600);
    } catch (e) {
      embStatus = -1;
      embBody = String(e);
    }

    return new Response(JSON.stringify({
      base,
      keySet,
      keyPreview: keySet ? (key.slice(0, 4) + "…" + key.slice(-4)) : null,
      dns,
      tls: { ok: tlsOk, status: tlsStatus, body: tlsBody },
      models: { status: modelsStatus, body: modelsBody },
      embeddings: { status: embStatus, body: embBody },
      ts: new Date().toISOString()
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (e: any) {
    console.error('[helpbot-health] Error:', e);
    return new Response(JSON.stringify({ 
      error: String(e), 
      base: getLovableBaseUrl(),
      ts: new Date().toISOString()
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
