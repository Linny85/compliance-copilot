import { requireAuth, roles, type JwtClaims } from "./utils/security.ts";
export { allowedOriginForRequest, assertOrigin, extractHost, extractOriginHost } from "./origin.ts";

export type AccessContext = {
  userId: string;
  tenantId: string;
  roles: string[];
  claims: JwtClaims;
};

export function requireUserAndTenant(req: Request): AccessContext | Response {
  const base = requireAuth(req);
  if (base instanceof Response) return base;
  return {
    ...base,
    roles: roles(base.claims),
  };
}

export function sessionBelongsToTenant(sessionId: string | null | undefined, tenantId: string): boolean {
  if (!sessionId) return false;
  return sessionId.startsWith(`${tenantId}:`);
}
