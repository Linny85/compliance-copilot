/**
 * Edge Function RBAC Utilities
 * Provides role-based access control for Supabase Edge Functions
 */

export type Role = 'viewer' | 'member' | 'manager' | 'admin';

export type JwtClaims = {
  sub?: string;
  tenant_id?: string;
  app_metadata?: {
    roles?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export const ROLE_ORDER: Role[] = ['viewer', 'member', 'manager', 'admin'];

/**
 * Check if user has at least the required role
 * @param roles - Array of user roles from JWT claims
 * @param need - Minimum required role
 * @returns true if user has sufficient role
 */
export function hasRoleAtLeast(roles: string[] | undefined, need: Role): boolean {
  if (!roles || roles.length === 0) return need === 'viewer';
  
  const userRole = roles.find(r => ROLE_ORDER.includes(r as Role)) as Role | undefined;
  if (!userRole) return false;
  
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(need);
}

/**
 * Extract and parse JWT claims from Authorization header
 * @param req - Incoming request
 * @returns Parsed JWT claims or null if invalid
 */
export function getClaims(req: Request): JwtClaims | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  
  try {
    const token = auth.slice(7);
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed !== null ? parsed as JwtClaims : null;
  } catch {
    return null;
  }
}

/**
 * Extract roles array from JWT claims
 * @param claims - Parsed JWT claims
 * @returns Array of role strings
 */
export function getRoles(claims: JwtClaims | null | undefined): string[] {
  return claims?.app_metadata?.roles ?? [];
}

/**
 * Extract tenant ID from JWT claims
 * @param claims - Parsed JWT claims
 * @returns Tenant ID or null
 */
export function getTenantId(claims: JwtClaims | null | undefined): string | null {
  return claims?.tenant_id ?? null;
}

/**
 * Extract user ID from JWT claims
 * @param claims - Parsed JWT claims
 * @returns User ID (sub) or null
 */
export function getUserId(claims: JwtClaims | null | undefined): string | null {
  return claims?.sub ?? null;
}

/**
 * Guard function to require minimum role
 * Returns error Response if unauthorized/forbidden, null if OK
 * 
 * Usage:
 * ```ts
 * const guard = requireRole(req, 'manager');
 * if (guard) return guard;
 * // ... proceed with business logic
 * ```
 * 
 * @param req - Incoming request
 * @param minRole - Minimum required role (default: 'member')
 * @returns Response with error or null if authorized
 */
export function requireRole(req: Request, minRole: Role = 'member'): Response | null {
  const claims = getClaims(req);
  
  if (!claims) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'content-type': 'text/plain' }
    });
  }
  
  const roles = getRoles(claims);
  if (!hasRoleAtLeast(roles, minRole)) {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'content-type': 'text/plain' }
    });
  }
  
  return null;
}

/**
 * Check if user has admin role
 * @param claims - Parsed JWT claims
 * @returns true if user is admin
 */
export function isAdmin(claims: JwtClaims | null | undefined): boolean {
  const roles = getRoles(claims);
  return roles.includes('admin');
}

/**
 * Check if user has manager or admin role
 * @param claims - Parsed JWT claims
 * @returns true if user is manager or admin
 */
export function isManager(claims: JwtClaims | null | undefined): boolean {
  return hasRoleAtLeast(getRoles(claims), 'manager');
}
