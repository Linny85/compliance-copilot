import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getLicenseStatus, type TenantLicense } from '../../supabase/functions/_shared/license.ts';

type MaybeLicense = TenantLicense | null;

type MaybeSingleResult = { data: MaybeLicense; error: null };

type SelectChain = {
  select: () => SelectChain;
  eq: () => { maybeSingle: () => Promise<MaybeSingleResult> };
};

function createClientMock(response: MaybeLicense): SupabaseClient {
  const chain: SelectChain = {
    select: () => chain,
    eq: () => ({ maybeSingle: async () => ({ data: response, error: null }) }),
  };

  return {
    from: () => chain,
  } as unknown as SupabaseClient;
}

function buildLicense(overrides: Partial<TenantLicense> = {}): TenantLicense {
  return {
    tenant_id: 'tenant-1',
    license_tier: 'pro',
    license_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    license_max_users: 25,
    license_allowed_origins: ['app.compliance-copilot.eu'],
    license_notes: null,
    ...overrides,
  };
}

describe('getLicenseStatus', () => {
  it('returns none when no license row exists', async () => {
    const client = createClientMock(null);
    const result = await getLicenseStatus(client, 'tenant-1', {
      originHost: 'https://app.compliance-copilot.eu',
    });
    expect(result.tier).toBe('none');
    expect(result.isActive).toBe(false);
    expect(result.blockedReason).toBe('no_license');
  });

  it('marks expired licenses as inactive', async () => {
    const client = createClientMock(
      buildLicense({ license_tier: 'basic', license_expires_at: '2020-01-01T00:00:00.000Z' })
    );
    const result = await getLicenseStatus(client, 'tenant-1', { now: new Date('2025-01-01') });
    expect(result.isActive).toBe(false);
    expect(result.blockedReason).toBe('expired');
  });

  it('detects origin blocks based on domain allowlist', async () => {
    const client = createClientMock(
      buildLicense({ license_allowed_origins: ['app.compliance-copilot.eu'] })
    );
    const result = await getLicenseStatus(client, 'tenant-1', {
      originHost: 'https://admin.example.com',
    });
    expect(result.isActive).toBe(false);
    expect(result.blockedReason).toBe('origin_blocked');
  });

  it('returns active status for valid trial license', async () => {
    const client = createClientMock(
      buildLicense({ license_tier: 'trial', license_expires_at: null })
    );
    const result = await getLicenseStatus(client, 'tenant-1', {
      originHost: 'https://app.compliance-copilot.eu',
    });
    expect(result.isActive).toBe(true);
    expect(result.isTrial).toBe(true);
    expect(result.tier).toBe('trial');
  });
});
