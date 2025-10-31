export type Probe = { name: string; status: 'ok'|'warn'|'fail'; detail?: any };

export async function head(url: string) {
  const common: RequestInit = {
    cache: 'no-store',
    redirect: 'manual',          // wir wollen die Location-Header sehen
    credentials: 'include',      // Auth-Cookies berücksichtigen
  };

  // 1) HEAD versuchen
  let res: Response | null = null;
  try {
    res = await fetch(url, { ...common, method: 'HEAD' });
  } catch {
    // ignorieren, wir versuchen gleich GET
  }

  // 2) Fallback auf GET, wenn HEAD ungeeignet war
  if (!res || [0, 404, 405].includes(res.status)) {
    res = await fetch(url, { ...common, method: 'GET' });
  }

  return { ok: res.ok, status: res.status, headers: res.headers };
}

export function exportJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
