/**
 * Maps route pathnames to contextHelp keys for Norrly assistance
 */
export function getContextKey(pathname: string): string | undefined {
  if (!pathname) return undefined;
  const clean = pathname.split('?')[0].replace(/\/$/, '');

  const map: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/incidents': 'incidents',
    '/incidents/new': 'incidents',
    '/checks': 'checks',
    '/checks/new': 'checks:new',
    '/audit': 'audit:list',
    '/audit/new': 'audit:new',
    '/privacy/dpia': 'dpia:list',
    '/documents': 'documents',
    '/documents/new': 'documents:new',
    '/controls': 'controls',
    '/controls/mapping': 'controls:mapping',
    '/evidence': 'evidence',
    '/scope': 'scope',
    '/nis2': 'nis2',
    '/ai-act': 'ai-act',
    '/ai-systems/register': 'ai-systems:register',
    '/organization': 'organization',
    '/company-profile': 'company-profile',
    '/billing': 'billing',
    '/admin/ops': 'admin:ops',
    '/admin/training-certificates': 'admin:training-certificates'
  };

  // Exakte Treffer prüfen
  if (map[clean]) return map[clean];

  // Dynamische Detailrouten (z. B. /audit/123 oder /privacy/dpia/abc)
  if (/^\/audit\//.test(clean)) return 'audit:detail';
  if (/^\/privacy\/dpia\//.test(clean)) return 'dpia:detail';

  // Parent-Level prüfen (z. B. /documents/123 → /documents)
  const parent = '/' + clean.split('/')[1];
  if (map[parent]) return map[parent];

  // Letzter Fallback
  return 'dashboard';
}
