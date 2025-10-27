import { useAppMode } from "@/state/AppModeProvider";
import { useBillingStatus } from "@/hooks/useBilling";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface TrialBannerProps {
  tenantId?: string | null;
}

export function TrialBanner({ tenantId }: TrialBannerProps) {
  const { mode } = useAppMode();
  const { data } = useBillingStatus(tenantId);
  const [starting, setStarting] = useState(false);
  const { t } = useTranslation(['billing', 'common']);

  // Demo-Modus zeigt eigenes Banner
  if (mode === 'demo') return null;
  if (!data) return null;
  if (data.paid_active) return null;

  const startTrial = async () => {
    setStarting(true);
    try {
      // @ts-ignore - RPC function not in generated types yet
      const { error } = await supabase.rpc('start_or_reset_trial', { days: 14 });
      if (error) throw error;
      toast.success(t('billing:trialStarted'), {
        description: t('billing:trialStartedDesc')
      });
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      console.error(err);
      toast.error(t('billing:trialStartFailed'), {
        description: t('billing:trialStartFailedDesc')
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="container mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          {data.trial_active ? (
            <>
              🧪 <strong>{t('billing:trialActive')}.</strong> {t('billing:allAvailableFeatures')} – {t('billing:daysLeft', { count: data.trial_days_left })}
            </>
          ) : (
            <>
              🧪 <strong>{t('billing:startTrial')}.</strong> {t('billing:allAvailableFeatures')}
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {!data.trial_active && (
            <button
              onClick={startTrial}
              disabled={starting}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              {starting ? t('billing:startingTrial') : t('billing:startTrial')}
            </button>
          )}
          <Link
            to="/billing"
            className="rounded-lg border border-amber-700/30 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-900/10 dark:text-amber-200"
          >
            {t('billing:upgradeNow')}
          </Link>
        </div>
      </div>
    </div>
  );
}
