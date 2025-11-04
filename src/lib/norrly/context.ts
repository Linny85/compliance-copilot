/**
 * Maps route pathnames to contextHelp keys for Norrly assistance
 */
export function getContextKey(pathname: string): string {
  if (!pathname) return 'dashboard';
  const clean = pathname.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';

  const map: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/incidents': 'incidents',
    '/incidents/new': 'incidents',
    '/checks': 'checks',
    '/checks/new': 'checks.new',
    '/audit': 'audit.list',
    '/audit/new': 'audit.new',
    '/privacy/dpia': 'dpia.list',
    '/documents': 'documents',
    '/documents/new': 'documents.new',
    '/controls/mapping': 'controls.mapping',
    '/controls/new': 'measures.new',
    '/controls': 'measures',
    '/measures/new': 'measures.new',
    '/measures': 'measures',
    '/evidence': 'evidence',
    '/scope': 'scope',
    '/nis2': 'nis2',
    '/ai-act': 'ai-act',
    '/ai-systems/register': 'ai-systems.register',
    '/organization': 'organization',
    '/company-profile': 'company-profile',
    '/billing': 'billing',
    '/admin/ops': 'admin.ops',
    '/admin/training-certificates': 'admin.training-certificates'
  };

  // Longest-Prefix-Match: längste Übereinstimmung zuerst
  const hit = Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .find(prefix => clean === prefix || clean.startsWith(prefix + '/'));
  
  if (hit) {
    if (import.meta.env.DEV) {
      console.debug('[norrly:context]', clean, '→', map[hit]);
    }
    return map[hit];
  }

  // Dynamische Detailrouten (z. B. /audit/123 oder /privacy/dpia/abc)
  if (/^\/audit\/[^/]+$/.test(clean)) return 'audit.detail';
  if (/^\/privacy\/dpia\/[^/]+$/.test(clean)) return 'dpia.detail';

  // Letzter Fallback
  return 'dashboard';
}
