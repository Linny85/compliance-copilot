// Central Lovable AI Gateway Client
export function getLovableBaseUrl(): string {
  // 1) Supabase Secret → 2) Function-Env → 3) Fallback (correct)
  const url =
    Deno.env.get('LOVABLE_API_BASE_URL') ??
    Deno.env.get('LOVABLE_BASE_URL') ?? // legacy fallback
    'https://ai.gateway.lovable.dev/v1';

  // Visible logging for verification in logs
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

  // Add API key if available
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (key && !headers.get('Authorization')) {
    headers.set('Authorization', `Bearer ${key}`);
  }

  console.log(`[lovableFetch] Calling: ${url}`);
  
  const res = await fetch(url, { ...init, headers });
  return res;
}

export async function embed(text: string, dimensions: number = 1536): Promise<number[]> {
  const model = Deno.env.get('EMB_MODEL') ?? 'text-embedding-3-large';
  
  const res = await lovableFetch('/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      model,
      input: text,
      dimensions
    })
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Embedding failed');
  }

  return data.data[0].embedding as number[];
}

export async function chat(messages: Array<{role: string; content: string}>, model?: string, temperature: number = 0.2): Promise<string> {
  const chatModel = model ?? Deno.env.get('MODEL') ?? 'google/gemini-2.5-flash';
  
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
    throw new Error(data?.error?.message ?? 'Chat failed');
  }

  return data.choices?.[0]?.message?.content ?? '';
}
