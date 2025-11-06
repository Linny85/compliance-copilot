import { calcOverallWithTraining } from '@/lib/compliance/overallWithTraining';

type AnySummary = Record<string, any> | null | undefined;
const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function overallFromSummary(
  summary: AnySummary,
  opts?: { mode?: 'weighted' | 'strict'; weight?: number }
) {
  const nis2 = toNum(summary?.nis2 ?? summary?.nis2Score);
  const ai = toNum(summary?.aiAct ?? summary?.ai ?? summary?.aiScore);
  const gdpr = toNum(summary?.gdpr ?? summary?.gdprScore);

  const trNis2 = toNum(summary?.training_percent_nis2);
  const trAi = toNum(summary?.training_percent_ai_act);
  const trGdpr = toNum(summary?.training_percent_gdpr);

  return calcOverallWithTraining({
    nis2,
    aiAct: ai,
    gdpr,
    trNis2,
    trAiAct: trAi,
    trGdpr,
    mode: opts?.mode ?? 'weighted',
    weight: typeof opts?.weight === 'number' ? opts.weight : 0.2
  });
}
