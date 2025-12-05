import { corsHeaders } from "../_shared/cors.ts";
import { getAiProviderInfo, aiFetch } from "../_shared/aiClient.ts";

type DnsReport = {
  a: string[];
  aaaa: string[];
  err: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const info = getAiProviderInfo();
    const base = info.baseUrl;
    const keySet = info.keySet;

    // 0) DNS resolution from Edge Runtime
    const dns: DnsReport = { a: [], aaaa: [], err: null };
    try {
      dns.a = await Deno.resolveDns(new URL(base).hostname, "A");
      try { dns.aaaa = await Deno.resolveDns(new URL(base).hostname, "AAAA"); } catch { dns.aaaa = []; }
    } catch (error) { dns.err = String(error); }

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
      const mRes = await aiFetch("/models", {
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
      const embRes = await aiFetch("/embeddings", {
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
      provider: info.provider,
      dns,
      tls: { ok: tlsOk, status: tlsStatus, body: tlsBody },
      models: { status: modelsStatus, body: modelsBody },
      embeddings: { status: embStatus, body: embBody },
      ts: new Date().toISOString()
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (error: unknown) {
    console.error('[helpbot-health] Error:', error);
    return new Response(JSON.stringify({ 
      error: String(error), 
      base: getAiProviderInfo().baseUrl,
      ts: new Date().toISOString()
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
