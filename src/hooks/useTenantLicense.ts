import { useMemo } from 'react';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { useTenantStore } from '@/store/tenant';

export type TenantLicenseInfo = {
  tier: 'trial' | 'basic' | 'pro' | 'enterprise' | 'none';
  isActive: boolean;
  isTrial: boolean;
  expiresAt: string | null;
  blockedReason?: 'no_license' | 'expired' | 'origin_blocked' | 'capability_blocked';
  allowedOrigins: string[];
  maxUsers: number | null;
  notes: string | null;
};

export type TenantLicenseState = {
  tenantId: string | null;
  license: TenantLicenseInfo | null;
  loading: boolean;
  error?: string;
  refresh: () => Promise<unknown>;
};

type LicenseStatusResponse = {
  ok: boolean;
  tenantId: string;
  license: TenantLicenseInfo;
  error?: string;
};

function buildFunctionsUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return `/functions/v1/${path}`;
  return `${base.replace(/\/?$/, '')}/functions/v1/${path}`;
}

export function useTenantLicense(): TenantLicenseState {
  const { tenantId } = useTenantStore();

  const query = useTenantQuery<LicenseStatusResponse>(
    'license-status',
    async (_tenantId) => {
      const res = await fetch(buildFunctionsUrl('license-status'), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`License status request failed (${res.status})`);
      }
      return (await res.json()) as LicenseStatusResponse;
    },
    {
      enabled: !!tenantId,
      staleTime: 60_000,
    }
  );

  return useMemo(() => {
    const data = query.data;
    const networkError = query.error?.message;
    const responseError = !networkError && data && data.ok === false ? data.error : undefined;

    return {
      tenantId: tenantId ?? null,
      license: data?.license ?? null,
      loading: query.isLoading || query.isFetching,
      error: networkError ?? responseError,
      refresh: query.refetch,
    } satisfies TenantLicenseState;
  }, [query.data, query.error, query.isFetching, query.isLoading, query.refetch, tenantId]);
}
