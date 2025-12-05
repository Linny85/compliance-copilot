// Minimal declarations so TypeScript understands the ambient Deno/process globals in Supabase edge
// and local tooling contexts. Keeps parity with other shared helpers.
declare const Deno: { env: { get(key: string): string | undefined } } | undefined;
declare const process: { env?: Record<string, string | undefined> } | undefined;

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractHost } from "./origin.ts";

export type LicenseTier = "trial" | "basic" | "pro" | "enterprise";
export type LicenseCapability = "helpbot" | "email" | "reports" | "ai";
export type LicenseFailureReason = "no_license" | "expired" | "origin_blocked" | "capability_blocked";

export type TenantLicense = {
  tenant_id: string;
  license_tier: LicenseTier;
  license_expires_at: string | null;
  license_max_users: number | null;
  license_allowed_origins: string[];
  license_notes: string | null;
};

export type LicenseStatusOptions = {
  originHost?: string | null;
  now?: Date;
};

export type LicenseStatusSummary = {
  tier: LicenseTier | "none";
  isActive: boolean;
  isTrial: boolean;
  expiresAt: string | null;
  blockedReason?: LicenseFailureReason;
  allowedOrigins: string[];
  maxUsers: number | null;
  notes: string | null;
};

export type AssertLicenseOptions = {
  capability?: LicenseCapability;
  originHost?: string | null;
  now?: Date;
};

export type LicenseCheckResult =
  | { ok: true; license: TenantLicense }
  | { ok: false; reason: LicenseFailureReason; license: TenantLicense | null };

const CAPABILITY_MATRIX: Record<LicenseTier, Set<LicenseCapability>> = {
  trial: new Set(["helpbot", "ai"]),
  basic: new Set(["helpbot", "ai", "email"]),
  pro: new Set(["helpbot", "ai", "email", "reports"]),
  enterprise: new Set(["helpbot", "ai", "email", "reports"]),
};

export async function getTenantLicense(
  client: SupabaseClient,
  tenantId: string
): Promise<TenantLicense | null> {
  const { data, error } = await client
    .from("Unternehmen")
    .select(
      "id, license_tier, license_expires_at, license_max_users, license_allowed_origins, license_notes"
    )
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    console.error("[license] failed to load tenant license", error);
    return null;
  }

  if (!data) return null;

  const allowedOrigins = Array.isArray(data.license_allowed_origins)
    ? (data.license_allowed_origins as string[])
    : [];

  return {
    tenant_id: data.id,
    license_tier: (data.license_tier ?? "trial") as LicenseTier,
    license_expires_at: data.license_expires_at,
    license_max_users: data.license_max_users,
    license_allowed_origins: allowedOrigins,
    license_notes: data.license_notes ?? null,
  };
}

export function isLicenseActive(license: TenantLicense | null, now = new Date()): boolean {
  if (!license) return false;
  if (!license.license_expires_at) return true;
  const expiresAt = new Date(license.license_expires_at);
  return expiresAt.getTime() >= now.getTime();
}

export function isOriginAllowed(license: TenantLicense | null, originHost: string | null): boolean {
  if (!license) return false;
  const allowedOrigins = license.license_allowed_origins ?? [];
  if (!allowedOrigins.length) return true;

  const normalizedHost = normalizeHost(originHost);
  if (!normalizedHost) return false;

  return allowedOrigins.some((pattern) => matchHost(normalizedHost, pattern));
}

export async function assertLicense(
  client: SupabaseClient,
  tenantId: string,
  opts: AssertLicenseOptions = {}
): Promise<LicenseCheckResult> {
  const license = await getTenantLicense(client, tenantId);
  if (!license) {
    return { ok: false, reason: "no_license", license: null };
  }

  if (!isLicenseActive(license, opts.now)) {
    return { ok: false, reason: "expired", license };
  }

  if (!isOriginAllowed(license, opts.originHost ?? null)) {
    return { ok: false, reason: "origin_blocked", license };
  }

  if (opts.capability) {
    const allowedCaps = CAPABILITY_MATRIX[license.license_tier] ?? CAPABILITY_MATRIX.trial;
    if (!allowedCaps.has(opts.capability)) {
      return { ok: false, reason: "capability_blocked", license };
    }
  }

  return { ok: true, license };
}

export async function getLicenseStatus(
  client: SupabaseClient,
  tenantId: string,
  opts: LicenseStatusOptions = {}
): Promise<LicenseStatusSummary> {
  const license = await getTenantLicense(client, tenantId);
  if (!license) {
    return {
      tier: "none",
      isActive: false,
      isTrial: false,
      expiresAt: null,
      blockedReason: "no_license",
      allowedOrigins: [],
      maxUsers: null,
      notes: null,
    };
  }

  const active = isLicenseActive(license, opts.now);
  const originAllowed = isOriginAllowed(license, opts.originHost ?? null);
  let blockedReason: LicenseFailureReason | undefined;
  if (!active) {
    blockedReason = "expired";
  } else if (!originAllowed) {
    blockedReason = "origin_blocked";
  }

  return {
    tier: license.license_tier,
    isActive: !blockedReason,
    isTrial: license.license_tier === "trial",
    expiresAt: license.license_expires_at,
    blockedReason,
    allowedOrigins: license.license_allowed_origins,
    maxUsers: license.license_max_users,
    notes: license.license_notes,
  };
}

function matchHost(host: string, rawPattern: string): boolean {
  const trimmed = rawPattern.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("*.")) {
    const wildcardTarget = normalizeHost(trimmed.slice(2)) ?? trimmed.slice(2).toLowerCase();
    if (!wildcardTarget) return false;
    return host === wildcardTarget || host.endsWith(`.${wildcardTarget}`);
  }

  const normalizedPattern = normalizeHost(trimmed);
  if (!normalizedPattern) return false;
  return host === normalizedPattern;
}

function normalizeHost(value: string | null): string | null {
  const host = extractHost(value);
  if (!host) return null;
  return host.replace(/^\.+/, "");
}
