/**
 * Training Coverage Hook
 * Extracts training coverage percentages from compliance summary
 * Based on role/sector needs assessment, not total employee count
 */

export type TrainingCoverage = {
  overall: number | null;
  nis2: number | null;
  aiAct: number | null;
  gdpr: number | null;
  employeeCount: number | null;
  participantsTotal: number | null;
  required: {
    nis2: number | null;
    aiAct: number | null;
    gdpr: number | null;
  };
};

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function useTrainingCoverage(summary: any): TrainingCoverage {
  return {
    overall: toNum(summary?.training_percent),
    nis2: toNum(summary?.training_percent_nis2),
    aiAct: toNum(summary?.training_percent_ai_act),
    gdpr: toNum(summary?.training_percent_gdpr),
    employeeCount: toNum(summary?.employee_count),
    participantsTotal: toNum(summary?.participants_total),
    required: {
      nis2: toNum(summary?.nis2_required),
      aiAct: toNum(summary?.ai_act_required),
      gdpr: toNum(summary?.gdpr_required),
    },
  };
}
