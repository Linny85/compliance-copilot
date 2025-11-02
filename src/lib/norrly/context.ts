/**
 * Maps route pathnames to contextHelp keys for Norrly assistance
 */
export function getContextKey(pathname: string): string | undefined {
  const clean = pathname.split('?')[0].replace(/\/$/, '');
  
  const map: Record<string, string> = {
    '/dashboard': 'dashboard',
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
    '/admin/training-certificates': 'admin:training-certificates'
  };

  if (map[clean]) return map[clean];

  // Fallback: dynamic detail paths (e.g., /audit/123, /privacy/dpia/abc)
  if (/^\/audit\//.test(clean)) return 'audit:list';
  if (/^\/privacy\/dpia\//.test(clean)) return 'dpia:list';

  // Final fallback: map to first segment parent path
  const parent = clean.split('/').slice(0, 2).join('/') || clean;
  return map[parent];
}
