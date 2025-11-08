import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useTenantStore } from '@/store/tenant';

/**
 * Tenant-aware query hook that automatically includes tenantId in the query key
 * and handles the enabled state based on tenant selection.
 */
export function useTenantQuery<T>(
  key: string,
  fetcher: (tenantId: string) => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  const { tenantId } = useTenantStore();

  return useQuery<T, Error>({
    queryKey: ['tenant', tenantId, key],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');
      return fetcher(tenantId);
    },
    enabled: !!tenantId && (options?.enabled ?? true),
    staleTime: 60_000, // 1 minute default
    ...options,
  });
}
