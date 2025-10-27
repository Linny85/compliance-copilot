// Central Lovable AI Gateway Client
import { getTenantOpenAIKey } from './openaiClient.ts';

export function getLovableBaseUrl(): string {
  const url =
    (Deno.env.get('LOVABLE_API_BASE_URL') ?? 
     Deno.env.get('LOVABLE_BASE_URL') ?? 
     'https://ai.gateway.lovable.dev/v1').trim();

  console.log(`[lovableClient] BASE_URL=${url}`);
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export async function lovableFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getLovableBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
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

  // Auth
  const key = (Deno.env.get('LOVABLE_API_KEY') ?? '').trim();
  if (key && !headers.get('Authorization')) {
    headers.set('Authorization', `Bearer ${key}`);
  }

  // Debug logging with request ID
  const reqId = crypto.randomUUID();
  console.log(`[lovableFetch:${reqId}] ${init.method ?? 'GET'} ${url}`);

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
      return res;
    } catch (e) {
      console.warn(`[lovableFetch:${reqId}] first attempt failed:`, String(e));
      // One short retry on network/TLS error
      const res = await fetch(url, { 
        ...init, 
        headers, 
        redirect: 'follow' 
      });
      return res;
    }
  } finally {
    clearTimeout(t);
  }
}

export async function embed(text: string, tenantId?: string): Promise<number[]> {
  const model = Deno.env.get('EMB_MODEL') ?? 'text-embedding-3-small';
  
  // Lovable AI Gateway supports NO embedding models - use OpenAI directly
  // Supports optional tenant-specific keys via FEATURE_TENANT_OPENAI_KEYS flag
  const openaiKey = await getTenantOpenAIKey(tenantId);
  if (!openaiKey) {
    throw new Error('No OpenAI key configured for embeddings (global or tenant)');
  }

  console.log('[embed] Calling OpenAI embeddings API', { model, textLength: text.length, tenantId: tenantId ? 'set' : 'none' });
  
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
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

export async function embedBatch(chunks: string[], tenantId?: string): Promise<number[][]> {
  const model = Deno.env.get('EMB_MODEL') ?? 'text-embedding-3-small';
  
  // Lovable AI Gateway supports NO embedding models - use OpenAI directly
  // Supports optional tenant-specific keys via FEATURE_TENANT_OPENAI_KEYS flag
  const openaiKey = await getTenantOpenAIKey(tenantId);
  if (!openaiKey) {
    throw new Error('No OpenAI key configured for embeddings (global or tenant)');
  }

  console.log('[embedBatch] Calling OpenAI embeddings API', { model, count: chunks.length, tenantId: tenantId ? 'set' : 'none' });
  
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
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
