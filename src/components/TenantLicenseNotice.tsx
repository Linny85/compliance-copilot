import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTenantLicense } from '@/hooks/useTenantLicense';
import { useTenantStore } from '@/store/tenant';

const LICENSE_HELP_URL = 'https://compliance-copilot.eu/licensing';

export default function TenantLicenseNotice() {
  const { t, ready } = useTranslation('common', { useSuspense: false });
  const { tenantId } = useTenantStore();
  const { license, loading, error } = useTenantLicense();

  if (!ready || !tenantId || loading) return null;

  if (error) {
    return (
      <div className="px-4">
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('license.banner.title', 'License status unavailable')}</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!license || license.isActive) return null;

  const reasonKey = license.blockedReason ?? 'inactive';
  const description = t(`license.banner.${reasonKey}`, t('license.banner.inactive'));

  return (
    <div className="px-4">
      <Alert variant="destructive" className="mt-3" data-testid="tenant-license-notice">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('license.banner.title', 'License required')}</AlertTitle>
        <AlertDescription>
          {description}
          {' '}
          <a
            href={LICENSE_HELP_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
          >
            {t('license.banner.link', 'Manage license')}
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
}
