import { overallFromSummary } from '@/lib/compliance/overallFromSummary';
import { useTenantSettings } from '@/hooks/useTenantSettings';

type AnySummary = Record<string, any> | null | undefined;

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function useOverallCompliance(summary: AnySummary) {
  const settings = useTenantSettings();

  const nis2 = toNum(summary?.nis2 ?? summary?.nis2Score);
  const ai = toNum(summary?.aiAct ?? summary?.ai ?? summary?.aiScore);
  const gdpr = toNum(summary?.gdpr ?? summary?.gdprScore);

  const mode = (settings?.overall_training_mode as 'weighted' | 'strict') ?? 'weighted';
  const weight = toNum(settings?.overall_training_weight) ?? 0.2;

  return {
    overall: overallFromSummary(summary, { mode, weight }),
    chips: { nis2, ai, gdpr }
  };
}
