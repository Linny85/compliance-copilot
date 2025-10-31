export type RouteCase = {
  label: string;
  path: string;
  expect: '200' | '302->/auth' | '403' | '302->/target';
  // Optional: falls ein spezifisches Ziel erwartet wird
  target?: string;
};

const PROFILE = import.meta.env.VITE_QA_PROFILE ?? 'auth'; // 'auth' | 'unauth'

const AUTH_CASES: RouteCase[] = [
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
];

const UNAUTH_CASES: RouteCase[] = [
  { label: 'Ops (unauth)', path: '/admin/ops', expect: '302->/auth', target: '/auth' },
  { label: 'Billing (unauth)', path: '/billing', expect: '302->/auth', target: '/auth' },
  { label: 'Dashboard (unauth)', path: '/dashboard', expect: '302->/auth', target: '/auth' },
  { label: 'NIS2 (unauth)', path: '/nis2', expect: '302->/auth', target: '/auth' },
  { label: 'Login', path: '/auth', expect: '200' },
  { label: 'Landing', path: '/', expect: '200' },
];

export const ROUTE_CASES = PROFILE === 'unauth' ? UNAUTH_CASES : AUTH_CASES;
