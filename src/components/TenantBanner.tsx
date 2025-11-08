import { useTranslation } from 'react-i18next';
import { useTenantStore } from '@/store/tenant';
import TenantSelector from '@/components/TenantSelector';

export default function TenantBanner() {
  const { t, ready } = useTranslation('common', { useSuspense: false });
  const { tenantId } = useTenantStore();

  if (!ready || tenantId) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">
            {t('tenant.missingTitle', 'Kein Mandant ausgewählt')}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('tenant.missingDesc', 'Bitte wählen Sie einen Mandanten, um Daten zu laden.')}
          </div>
        </div>
        <TenantSelector />
      </div>
    </div>
  );
}
