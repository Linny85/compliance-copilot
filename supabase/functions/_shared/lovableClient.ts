// Central Lovable AI Gateway Client (supports direct or proxy mode)
import { logError, logInfo } from "./logger.ts";

export function getLovableBaseUrl(): string {
  // Prioritize PROXY_URL if set (for Cloudflare Worker proxy)
  const proxyUrl = Deno.env.get('PROXY_URL')?.trim();
  if (proxyUrl) {
    console.log(`[lovableClient] Using PROXY_URL=${proxyUrl}`);
    return proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
  }
  
  // Fallback to direct Lovable AI Gateway
  const url = (Deno.env.get('LOVABLE_API_BASE_URL') ?? 
               Deno.env.get('LOVABLE_BASE_URL') ?? 
               'https://ai.gateway.lovable.dev/v1').trim();
  console.log(`[lovableClient] Using direct BASE_URL=${url}`);
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export async function lovableFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const start = performance.now();
  const base = getLovableBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const method = (init.method || 'GET').toUpperCase();
  const usingProxy = !!Deno.env.get('PROXY_URL');
  let status = -1;
  
  const headers = new Headers(init.headers || {});
  
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.get('Accept')) {
    headers.set('Accept', 'application/json');
  }
  // HTTP/2 issues workaround: some gateways are more stable with H1
  if (!headers.get('Connection')) {
    headers.set('Connection', 'close');
  }

  // Auth: Use proxy secret if available, otherwise Lovable API key
  const proxySecret = Deno.env.get('PROXY_SHARED_SECRET')?.trim();
  if (proxySecret && !headers.get('x-proxy-secret')) {
    headers.set('x-proxy-secret', proxySecret);
  } else {
    const key = (Deno.env.get('LOVABLE_API_KEY') ?? '').trim();
    if (key && !headers.get('Authorization')) {
      headers.set('Authorization', `Bearer ${key}`);
    }
  }

  // Debug logging with request ID
  const reqId = crypto.randomUUID();
  console.log(`[lovableFetch:${reqId}] ${method} ${url}`);

  // Timeout + simple retry on network errors
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  
  try {
    try {
      const res = await fetch(url, { 
        ...init, 
        headers, 
        signal: controller.signal, 
        redirect: 'follow' 
      });
      status = res.status;
      const latency = Math.round(performance.now() - start);

      // Log erfolgreiche/degradierte Requests
      await logInfo({
        func: 'lovableClient',
        message: 'lovableFetch completed',
        using_proxy: usingProxy,
        base_url: base,
        path,
        method,
        status,
        latency_ms: latency,
        error_code: (status >= 500 ? 'HTTP_5XX' : status >= 400 ? 'HTTP_4XX' : null),
        details: { headers: Array.from(res.headers.entries()).slice(0, 10) }
      });

      return res;
    } catch (e) {
      console.warn(`[lovableFetch:${reqId}] first attempt failed:`, String(e));
      // One short retry on network/TLS error
      const res = await fetch(url, { 
        ...init, 
        headers, 
        redirect: 'follow' 
      });
      status = res.status;
      const latency = Math.round(performance.now() - start);

      await logInfo({
        func: 'lovableClient',
        message: 'lovableFetch completed (retry)',
        using_proxy: usingProxy,
        base_url: base,
        path,
        method,
        status,
        latency_ms: latency,
        error_code: (status >= 500 ? 'HTTP_5XX' : status >= 400 ? 'HTTP_4XX' : null),
        details: { retry: true }
      });

      return res;
    }
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    await logError({
      func: 'lovableClient',
      message: 'lovableFetch failed',
      using_proxy: usingProxy,
      base_url: base,
      path,
      method,
      status: -1,
      latency_ms: latency,
      error_code: 'FETCH_ERROR',
      details: { error: String(err) }
    });
    throw err;
  } finally {
    clearTimeout(t);
  }
}

export async function embed(text: string): Promise<number[]> {
  const model = Deno.env.get('EMB_MODEL') ?? 'text-embedding-3-small';
  
  console.log('[embed] Calling embeddings API', { model, textLength: text.length });
  
  const res = await lovableFetch('/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      model,
      input: text
    })
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.error('[embed] Failed:', data);
    throw new Error(data?.error?.message ?? `Embedding failed (${res.status})`);
  }

  return data.data[0].embedding as number[];
}

export async function embedBatch(chunks: string[]): Promise<number[][]> {
  const model = Deno.env.get('EMB_MODEL') ?? 'text-embedding-3-small';
  
  console.log('[embedBatch] Calling embeddings API', { model, count: chunks.length });
  
  const res = await lovableFetch('/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      model,
      input: chunks
    })
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    console.error('[embedBatch] Failed:', data);
    throw new Error(data?.error?.message ?? `Embedding failed (${res.status})`);
  }
  
  return data.data.map((d: any) => d.embedding);
}

export async function chat(messages: Array<{role: string; content: string}>, model?: string, temperature: number = 0.2): Promise<string> {
  const chatModel = model ?? Deno.env.get('MODEL') ?? 'google/gemini-2.5-flash';
  
  console.log('[chat] Calling chat completions', { model: chatModel, messageCount: messages.length });
  
  const res = await lovableFetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: chatModel,
      temperature,
      messages
    })
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.error('[chat] Failed:', data);
    throw new Error(data?.error?.message ?? `Chat failed (${res.status})`);
  }

  return data.choices?.[0]?.message?.content ?? '';
}
