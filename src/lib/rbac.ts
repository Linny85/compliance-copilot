// Datei: src/lib/rbac.ts
// Zweck: Sehr schlanker, erweiterbarer Check.
// Aktuell: prüft optionalen "role" aus deinem User-Context; fallback: true
export type UserLike = { role?: 'admin'|'member'|'viewer' } | null | undefined;

const adminOnly = new Set<string>([
  '/settings/users'
]);

export function canAccess(path: string, user: UserLike): boolean {
  if (!path) return false;
  if (adminOnly.has(path)) return !!user && user.role === 'admin';
  return true; // default allow – leicht erweiterbar
}
