import { corsHeaders } from "../_shared/cors.ts";
import { getLovableBaseUrl, lovableFetch } from "../_shared/lovableClient.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const base = getLovableBaseUrl();
    
    // Test with a minimal embedding request
    const res = await lovableFetch('/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'test',
        dimensions: 512
      })
    });
    
    const body = await res.text();
    
    return new Response(JSON.stringify({
      ok: res.ok,
      status: res.status,
      base,
      timestamp: new Date().toISOString(),
      body: body.slice(0, 300)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error('[helpbot-health] Error:', e);
    return new Response(JSON.stringify({
      ok: false,
      error: e?.message ?? String(e),
      base: getLovableBaseUrl(),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
