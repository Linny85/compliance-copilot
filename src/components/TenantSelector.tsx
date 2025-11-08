import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { resolveTenantId } from '@/lib/tenant';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantStore } from '@/store/tenant';

type Tenant = { id: string; name: string };

export default function TenantSelector() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { setTenant } = useTenantStore();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [value, setValue] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) Aktuelle Auswahl
      const current = await resolveTenantId();
      setValue(current);

      // 2) Verfügbare Tenants (Unternehmen-Tabelle)
      const { data } = await supabase
        .from('Unternehmen')
        .select('id, name')
        .order('name', { ascending: true });
      
      setTenants((data ?? []) as Tenant[]);
      setLoading(false);
    })();
  }, []);

  const handleChange = async (id: string) => {
    setValue(id);
    setTenant(id);
    
    // Optional: im Profil sichern
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).from('profiles')
        .update({ company_id: id })
        .eq('user_id', user.id);
    }
    
    // Invalidiere alle tenant-abhängigen Queries
    queryClient.invalidateQueries();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('tenant.loading')}</span>
      </div>
    );
  }

  if (tenants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tenant-select" className="text-sm font-medium">
        {t('tenant.label')}
      </label>
      <Select
        value={value ?? ''}
        onValueChange={handleChange}
        disabled={loading}
      >
        <SelectTrigger 
          id="tenant-select"
          className="w-[200px]" 
          aria-label={t('tenant.label')}
          aria-busy={loading ? 'true' : 'false'}
        >
          <SelectValue placeholder={t('tenant.choose')} />
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
