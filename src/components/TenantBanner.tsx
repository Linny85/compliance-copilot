import { useTranslation } from 'react-i18next';

export default function TenantBanner() {
  const { t } = useTranslation('common');
  return (
    <div
      role="status"
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      {t('tenant.none')}
    </div>
  );
}
