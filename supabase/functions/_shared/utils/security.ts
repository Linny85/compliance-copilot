import { createClient } from "@supabase/supabase-js";
import { encodeBase64 } from "std/encoding/base64.ts";

export type Role = 'viewer' | 'member' | 'manager' | 'admin';

export type JwtClaims = {
  sub?: string;
  tenant_id?: string;
  company_id?: string;
  app_metadata?: {
    roles?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EDIT_JWT_SECRET = Deno.env.get("ORG_EDIT_JWT_SECRET") || "default-secret-change-in-production-min-32-chars";
const PEPPER = Deno.env.get("ORG_MASTER_PEPPER") || "default-pepper-change-in-production-min-32-chars";

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

export function getClaims(req: Request): JwtClaims | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = auth.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed as JwtClaims : null;
  } catch {
    return null;
  }
}

export function jwtTenantId(claims: JwtClaims | null): string | null {
  return claims?.tenant_id ?? null;
}

export function jwtUserId(claims: JwtClaims | null): string | null {
  return claims?.sub ?? null;
}

export function roles(claims: JwtClaims | null): string[] {
  return claims?.app_metadata?.roles ?? [];
}

export function hasRoleAtLeast(rs: string[], need: Role): boolean {
  const order: Role[] = ['viewer','member','manager','admin'];
  const top = rs.find(r => order.includes(r as Role)) as Role | undefined;
  if (!top) return need === 'viewer';
  return order.indexOf(top) >= order.indexOf(need);
}

export function requireAuth(req: Request): {claims: JwtClaims; tenantId: string; userId: string} | Response {
  const claims = getClaims(req);
  if (!claims) return new Response("Unauthorized", { status: 401 });
  const tenantId = jwtTenantId(claims);
  const userId   = jwtUserId(claims);
  if (!tenantId || !userId) return new Response("Unauthorized", { status: 401 });
  return { claims, tenantId, userId };
}

export function requireRole(req: Request, min: Role = 'member'): {claims: JwtClaims; tenantId: string; userId: string} | Response {
  const base = requireAuth(req);
  if (base instanceof Response) return base;
  if (!hasRoleAtLeast(roles(base.claims), min)) {
    return new Response("Forbidden", { status: 403 });
  }
  return base;
}

/* ----- Tenant-specific SHA-256 hash with constant-time comparison ----- */
async function sha256Hash(tenantId: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  // Include tenant ID to ensure different hashes per tenant even with same password
  const data = encoder.encode(`${tenantId}:${password}:${PEPPER}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

export async function hashMaster(pw: string, tenantId: string): Promise<string> {
  return await sha256Hash(tenantId, pw);
}

export async function verifyMaster(hash: string, pw: string, tenantId: string): Promise<boolean> {
  const computed = await sha256Hash(tenantId, pw);
  if (hash.length !== computed.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ computed.charCodeAt(i);
  }
  return diff === 0;
}

/* ----- Helper to extract tenant from JWT or profile ----- */
export async function resolveTenantId(claims: JwtClaims | null): Promise<string | null> {
  // First try direct JWT claim
  const directClaim = claims?.tenant_id || claims?.company_id;
  if (directClaim) return directClaim;
  
  // Fallback: query profiles table for company_id
  const userId = jwtUserId(claims);
  if (!userId) return null;
  
  type ProfileRow = { company_id: string | null };

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  
  return data?.company_id ?? null;
}

/* ----- Very small signed token for edit window (HS256) ----- */
export async function signEditToken(payload: Record<string,unknown>, ttlSec=300): Promise<string> {
  const header = { alg: "HS256", typ:"JWT" };
  const exp = Math.floor(Date.now()/1000) + ttlSec;
  const body = { ...payload, exp };
  const enc = (obj:object)=> encodeBase64(new TextEncoder().encode(JSON.stringify(obj))).replaceAll("=","").replaceAll("+","-").replaceAll("/","_");
  const h = enc(header); const p = enc(body);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(EDIT_JWT_SECRET), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${h}.${p}`));
  const s = encodeBase64(new Uint8Array(sig)).replaceAll("=","").replaceAll("+","-").replaceAll("/","_");
  return `${h}.${p}.${s}`;
}

export async function verifyEditToken(token: string): Promise<Record<string,unknown> | null> {
  try {
    const [h,p,s] = token.split(".");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(EDIT_JWT_SECRET), {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, Uint8Array.from(atob(s.replaceAll("-","+").replaceAll("_","/")), c=>c.charCodeAt(0)), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(atob(p.replaceAll("-","+").replaceAll("_","/")));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload as Record<string, unknown>;
  } catch { return null; }
}

/* ----- Tiny KV-based rate limiter ----- */
let kv: Deno.Kv | null = null;
async function getKv(): Promise<Deno.Kv> {
  if (!kv) kv = await Deno.openKv();
  return kv;
}

export async function rateLimit(key: string, limit=5, windowSec=900): Promise<boolean> {
  const kvStore = await getKv();
  const rk = ["rl", key];
  const v = (await kvStore.get<number>(rk)).value ?? 0;
  if (v >= limit) return false;
  const atomic = kvStore.atomic();
  if (v === 0) atomic.set(rk, 1, { expireIn: windowSec*1000 });
  else atomic.set(rk, v+1);
  await atomic.commit();
  return true;
}
