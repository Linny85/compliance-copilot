export function isDemo(): boolean {
  // Demo per URL-Pfad (/auth/neu), Query (?demo=1) oder Build-Flag
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  const q = new URLSearchParams(window.location.search);
  return p.startsWith('/auth/neu') || q.has('demo') || import.meta.env.VITE_DEMO === 'true';
}
