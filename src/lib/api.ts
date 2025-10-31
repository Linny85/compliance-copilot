/**
 * Unified API wrapper with consistent 401/403 handling
 * Prevents page-level redirect loops by centralizing auth error handling
 */
export async function api(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init
  });

  // Handle authentication errors consistently
  if (response.status === 401) {
    window.location.replace('/auth');
    throw new Error('Unauthorized - redirecting to login');
  }

  // Handle authorization errors consistently
  if (response.status === 403) {
    window.location.replace('/403');
    throw new Error('Forbidden - insufficient permissions');
  }

  return response;
}

/**
 * Convenience wrapper for JSON responses
 */
export async function apiJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await api(url, init);
  return response.json();
}
