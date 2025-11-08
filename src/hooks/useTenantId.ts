import * as React from 'react';
import { resolveTenantId } from '@/lib/tenant';
import { useTenantStore } from '@/store/tenant';

export function useTenantId() {
  const { tenantId: storedTenantId, setTenant } = useTenantStore();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await resolveTenantId();
        if (mounted && id !== storedTenantId) {
          setTenant(id);
        }
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [storedTenantId, setTenant]);

  return { tenantId: storedTenantId, loading, error };
}
