// Minimal declaration so TypeScript understands the Deno global in Supabase Edge functions.
// At runtime, Deno is provided by the Supabase edge environment.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
} | undefined;

// Provide a lightweight declaration for Node-style process.env when running toolchain scripts.
declare const process: {
  env?: Record<string, string | undefined>;
} | undefined;

import { getTenantOpenAIKey } from './openaiClient.ts';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const denoEnv = typeof Deno !== 'undefined' ? Deno?.env : undefined;
const nodeEnv = typeof process !== 'undefined' ? process?.env : undefined;

const getEnv = (key: string): string | undefined => {
  if (denoEnv) {
    const value = denoEnv.get(key);
    if (typeof value === 'string') return value;
  }
  return nodeEnv?.[key];
};

const PROVIDER = (getEnv('AI_PROVIDER') ?? 'openai').toLowerCase();
const DEFAULT_CHAT_MODEL = getEnv('MODEL') ?? 'gpt-4.1-mini';
const DEFAULT_EMBED_MODEL = getEnv('EMB_MODEL') ?? 'text-embedding-3-small';

function resolveBaseUrl(): string {
  const base = (getEnv('AI_BASE_URL')
    ?? getEnv('OPENAI_BASE_URL')
    ?? 'https://api.openai.com/v1').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

async function resolveApiKey(tenantId?: string): Promise<string> {
  if (PROVIDER === 'openai') {
    const tenantKey = await getTenantOpenAIKey(tenantId);
    if (tenantKey) return tenantKey;
  }
  const fallback = (getEnv('AI_API_KEY') ?? getEnv('OPENAI_API_KEY') ?? '').trim();
  if (!fallback) {
    throw new Error('No AI API key configured');
  }
  return fallback;
}

export function getAiProviderInfo() {
  const key = (getEnv('AI_API_KEY') ?? getEnv('OPENAI_API_KEY') ?? '').trim();
  return {
    provider: PROVIDER,
    baseUrl: resolveBaseUrl(),
    keySet: key.length > 0,
  };
}

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
  tenantId?: string;
};

export type ChatCompletionResult = {
  content: string;
  usage?: Record<string, unknown>;
  raw: unknown;
};

export async function chatCompletion(params: ChatOptions & { messages: ChatMessage[] }): Promise<ChatCompletionResult> {
  const apiKey = await resolveApiKey(params.tenantId);
  const baseUrl = resolveBaseUrl();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_CHAT_MODEL,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 900,
      messages: params.messages,
      ...(params.responseFormat ? { response_format: params.responseFormat } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[aiClient.chatCompletion] failed', data);
    throw new Error(data?.error?.message ?? `Chat failed (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  return { content, usage: data.usage, raw: data };
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  // TODO: per-tenant quota / rate limit when multi-tenant AI usage is enforced
  const { content } = await chatCompletion({ ...options, messages });
  return content;
}

export type EmbedOptions = {
  model?: string;
  tenantId?: string;
  dimensions?: number;
};

type EmbeddingResponseEntry = {
  embedding: number[];
  [key: string]: unknown;
};

export async function embed(text: string, options: EmbedOptions = {}): Promise<number[]> {
  const apiKey = await resolveApiKey(options.tenantId);
  const baseUrl = resolveBaseUrl();
  const body: Record<string, unknown> = {
    model: options.model ?? DEFAULT_EMBED_MODEL,
    input: text,
  };
  if (options.dimensions) {
    body.dimensions = options.dimensions;
  }

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[aiClient.embed] failed', data);
    throw new Error(data?.error?.message ?? `Embedding failed (${res.status})`);
  }
  const entries = data.data as EmbeddingResponseEntry[] | undefined;
  return entries?.[0]?.embedding ?? [];
}

export async function embedBatch(texts: string[], options: EmbedOptions = {}): Promise<number[][]> {
  const apiKey = await resolveApiKey(options.tenantId);
  const baseUrl = resolveBaseUrl();
  const body: Record<string, unknown> = {
    model: options.model ?? DEFAULT_EMBED_MODEL,
    input: texts,
  };
  if (options.dimensions) {
    body.dimensions = options.dimensions;
  }

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[aiClient.embedBatch] failed', data);
    throw new Error(data?.error?.message ?? `Embedding batch failed (${res.status})`);
  }
  const entries = data.data as EmbeddingResponseEntry[] | undefined;
  return (entries ?? []).map((entry) => entry.embedding);
}

export async function aiFetch(path: string, init: RequestInit = {}, tenantId?: string) {
  const apiKey = await resolveApiKey(tenantId);
  const baseUrl = resolveBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}