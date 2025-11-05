import { calcOverall } from '@/lib/compliance/overall';

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
 * Supports multiple field name variants from different data sources
 */
export function useOverallCompliance(summary: AnySummary) {
  // Accept multiple field name variants
  const nis2 = toNum(summary?.nis2 ?? summary?.nis2Score);
  const ai = toNum(summary?.aiAct ?? summary?.ai ?? summary?.aiScore);
  const gdpr = toNum(summary?.gdpr ?? summary?.gdprScore);

  return {
    overall: calcOverall([
      { key: 'nis2', score: nis2 },
      { key: 'ai_act', score: ai },
      { key: 'gdpr', score: gdpr },
    ]),
    chips: { nis2, ai, gdpr }
  };
}
