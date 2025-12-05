import { allowedOriginForRequest } from "./access.ts";

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
};

export function buildCorsHeaders(req?: Request): Record<string, string> {
  const origin = allowedOriginForRequest(req);
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
  };
}

export const corsHeaders = buildCorsHeaders();

export function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
