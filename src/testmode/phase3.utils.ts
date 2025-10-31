// Kleine Utils für Phase 3

export function b64urlDecode(input: string): string {
  const pad = (s: string) => s + '==='.slice((s.length + 3) % 4);
  const base64 = pad(input.replace(/-/g, '+').replace(/_/g, '/'));
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

export function parseJwt(token?: string | null): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = b64urlDecode(parts[1]);
  try { 
    return JSON.parse(payload); 
  } catch { 
    return null; 
  }
}

export async function probeHttp(
  path: string, 
  method: 'GET' | 'POST' | 'HEAD' = 'POST', 
  body?: any
) {
  const init: RequestInit = {
    method,
    credentials: 'include',
    redirect: 'manual',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' }
  };
  
  if (body && method !== 'HEAD') {
    (init as any).body = JSON.stringify(body);
  }
  
  let res: Response | null = null;

  try { 
    res = await fetch(path, init); 
  } catch (_) { 
    /* ignore */ 
  }

  // Fallback: HEAD → GET, falls 404/405
  if (res && [404, 405].includes(res.status) && method === 'HEAD') {
    res = await fetch(path, { ...init, method: 'GET' });
  }

  if (!res) {
    return { status: 0, location: '', ok: false };
  }
  
  return {
    status: res.status,
    location: res.headers.get('location') || '',
    ok: res.ok
  };
}

// RBAC-Helfer
export function roleAtLeast(
  have: string | undefined, 
  need: 'viewer' | 'member' | 'manager' | 'admin', 
  order: readonly string[]
) {
  const h = order.indexOf(have || 'viewer');
  const n = order.indexOf(need);
  return h >= n;
}
