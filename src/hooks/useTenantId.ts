import * as React from 'react';
import { resolveTenantId } from '@/lib/tenant';

export function useTenantId() {
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await resolveTenantId();
        if (mounted) setTenantId(id);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { tenantId, loading, error };
}
