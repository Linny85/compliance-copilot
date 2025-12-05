import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { useTenantStore } from '@/store/tenant';
import { useTenantLicense } from '@/hooks/useTenantLicense';

export default function TenantLicenseBadge() {
  const { ready, t } = useTranslation('common', { useSuspense: false });
  const { tenantId } = useTenantStore();
  const { license, loading, error } = useTenantLicense();

  if (!ready || !tenantId) return null;

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('license.loading', 'Checking license…')}
      </Badge>
    );
  }

  if (error || !license) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <ShieldAlert className="h-3 w-3" />
        {t('license.badge.error', 'License check failed')}
      </Badge>
    );
  }

  const variant = license.isActive ? 'secondary' : 'destructive';
  const Icon = license.isActive ? ShieldCheck : ShieldAlert;
  const tierLabel = t(`license.tier.${license.tier}`, license.tier);
  const statusLabel = license.isActive
    ? t('license.badge.active', 'Active')
    : t('license.badge.inactive', 'Inactive');

  return (
    <Badge variant={variant} className="gap-1 text-xs" data-testid="tenant-license-badge">
      <Icon className="h-3 w-3" />
      {t('license.label', 'License')}: {tierLabel} · {statusLabel}
    </Badge>
  );
}
