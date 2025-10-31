export type RouteCase = {
  label: string;
  path: string;
  expect: '200' | '302->/auth' | '403' | '302->/target';
  // Optional: falls ein spezifisches Ziel erwartet wird
  target?: string;
};

export const ROUTE_CASES: RouteCase[] = [
  { label: 'Dashboard', path: '/dashboard', expect: '200' },
  { label: 'NIS2', path: '/nis2', expect: '200' },
  { label: 'AI Act', path: '/ai-act', expect: '200' },
  { label: 'Documents', path: '/documents', expect: '200' },
  { label: 'Billing', path: '/billing', expect: '200' },
  { label: 'Ops Dashboard', path: '/admin/ops', expect: '200' },
  { label: 'Zertifikate', path: '/admin/training-certificates', expect: '200' },
  { label: 'Email Admin', path: '/admin/email', expect: '200' },
  { label: 'Helpbot Manager', path: '/admin/helpbot', expect: '200' },
  { label: 'Graph Manager', path: '/admin/graph', expect: '200' },
  { label: 'Login', path: '/auth', expect: '200' },
  { label: 'Landing', path: '/', expect: '200' },
  
  // Beispiele für Guard-Erwartungen (falls unauthed getestet wird):
  // { label: 'Ops (unauth)', path: '/admin/ops', expect: '302->/auth', target: '/auth' },
  // { label: 'Admin-Only (member)', path: '/admin/admin-only', expect: '403' },
];
