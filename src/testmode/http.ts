export type Probe = { name: string; status: 'ok'|'warn'|'fail'; detail?: any };

export async function head(url: string) {
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store', redirect: 'manual' as RequestRedirect });
  return { ok: res.ok, status: res.status, headers: res.headers };
}

export function exportJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
