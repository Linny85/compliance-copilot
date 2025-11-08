export function detectBrowserLocale(
  supported = ['de', 'en', 'sv'], 
  fallback = 'de'
): string {
  // 1) URL parameter
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('lang') || url.searchParams.get('lng');
  if (fromQuery && supported.includes(fromQuery)) return fromQuery;

  // 2) LocalStorage
  const fromLS = localStorage.getItem('lng');
  if (fromLS && supported.includes(fromLS)) return fromLS;

  // 3) Browser navigator
  const nav = navigator.languages?.[0] || navigator.language || '';
  const short = nav.split('-')[0].toLowerCase();
  if (supported.includes(short)) return short;

  return fallback;
}
