import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantStore } from '@/store/tenant';

type Tenant = { id: string; name: string };

export default function TenantSelector({ className }: { className?: string }) {
  const { t, ready } = useTranslation('common', { useSuspense: false });
  const queryClient = useQueryClient();
  const { tenantId, setTenant } = useTenantStore();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(true);

  if (!ready) return null;

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('Unternehmen')
        .select('id, name')
        .order('name', { ascending: true });
      
      setTenants((data ?? []) as Tenant[]);
      setLoading(false);
    })();
  }, []);

  const handleChange = async (id: string) => {
    setTenant(id);
    
    // Optional: im Profil sichern
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).from('profiles')
        .update({ company_id: id })
        .eq('user_id', user.id);
    }
    
    // Gezielt tenant-abhängige Queries invalidieren
    queryClient.invalidateQueries({ queryKey: ['tenant'] });
  };

  return (
    <div className={className}>
      <Select 
        value={tenantId ?? ''}
        onValueChange={handleChange} 
        disabled={loading || tenants.length === 0}
      >
        <SelectTrigger 
          id="tenant-select"
          className="w-64" 
          aria-label={t('tenant.label')}
          aria-busy={loading ? 'true' : 'false'}
        >
          <SelectValue placeholder={loading ? t('tenant.loading') : t('tenant.label')} />
        </SelectTrigger>
        <SelectContent>
          {tenants.map(t => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
