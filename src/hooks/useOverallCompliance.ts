import { calcOverallWithTraining } from '@/lib/compliance/overallWithTraining';
import { useTenantSettings } from '@/hooks/useTenantSettings';

type AnySummary = Record<string, any> | null | undefined;

/**
 * Safely convert to number, returning null for invalid values
 */
const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Calculate overall compliance and individual framework scores
 * Includes training coverage influence based on tenant settings
 * Supports multiple field name variants from different data sources
 */
export function useOverallCompliance(summary: AnySummary) {
  const settings = useTenantSettings();

  // Accept multiple field name variants for framework scores
  const nis2 = toNum(summary?.nis2 ?? summary?.nis2Score);
  const ai = toNum(summary?.aiAct ?? summary?.ai ?? summary?.aiScore);
  const gdpr = toNum(summary?.gdpr ?? summary?.gdprScore);

  // Training percentages per framework
  const trNis2 = toNum(summary?.training_percent_nis2);
  const trAi = toNum(summary?.training_percent_ai_act);
  const trGdpr = toNum(summary?.training_percent_gdpr);

  // Mode and weight from tenant settings
  const mode = (settings?.overall_training_mode as 'weighted' | 'strict') ?? 'weighted';
  const weight = toNum(settings?.overall_training_weight) ?? 0.2;

  return {
    overall: calcOverallWithTraining({
      nis2,
      aiAct: ai,
      gdpr,
      trNis2,
      trAiAct: trAi,
      trGdpr,
      mode,
      weight
    }),
    chips: { nis2, ai, gdpr }
  };
}
