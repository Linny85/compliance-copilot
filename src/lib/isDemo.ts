export function isDemo(): boolean {
  // Demo per URL-Pfad (/auth/neu), Query (?demo=1), localStorage oder Build-Flag
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  const q = new URLSearchParams(window.location.search);
  const ls = localStorage.getItem('demoMode') === '1';
  return ls || p.startsWith('/auth/neu') || q.has('demo') || import.meta.env.VITE_DEMO === 'true';
}

export function setDemoMode(active: boolean) {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem('demoMode', '1');
  } else {
    localStorage.removeItem('demoMode');
  }
}
