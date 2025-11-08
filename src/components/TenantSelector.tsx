import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { resolveTenantId } from '@/lib/tenant';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Tenant = { id: string; name: string };

export default function TenantSelector() {
  const { t } = useTranslation('common');
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
    // Persistente Auswahl
    try { 
      localStorage.setItem('tenant_id', id); 
    } catch (e) {
      console.warn('Failed to save tenant to localStorage:', e);
    }
    // Reload für frische Daten
    window.location.reload();
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
