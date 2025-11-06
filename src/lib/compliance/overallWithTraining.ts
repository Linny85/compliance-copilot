/**
 * Overall Compliance with Training Influence
 * Calculates overall score by blending framework scores with training coverage
 */

export type OverallInputs = {
  // Framework scores (0..100 or null)
  nis2: number | null;
  aiAct: number | null;
  gdpr: number | null;
  // Training percentages per framework (0..100 or null)
  trNis2?: number | null;
  trAiAct?: number | null;
  trGdpr?: number | null;
  // Mode & weight
  mode?: 'weighted' | 'strict';
  weight?: number; // 0..1, only for weighted mode
};

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Blend framework score with training coverage (weighted mode)
 * Default: 80% framework, 20% training
 * Missing training values are treated as 100 (no penalty)
 */
function blendWeighted(score: number, training: number | null, weight: number): number {
  const t = training == null ? 100 : training;
  const w = Math.min(1, Math.max(0, weight));
  return Math.round((1 - w) * score + w * t);
}

/**
 * Cap framework score at training coverage (strict mode)
 * Framework score cannot exceed training coverage
 */
function blendStrict(score: number, training: number | null): number {
  const t = training == null ? 100 : training;
  return Math.min(score, t);
}

/**
 * Calculate overall compliance with training influence
 * @param inputs Framework scores, training percentages, mode and weight
 * @returns Overall score (0-100) or null if no valid scores
 */
export function calcOverallWithTraining(inputs: OverallInputs): number | null {
  const { nis2, aiAct, gdpr, trNis2, trAiAct, trGdpr, mode = 'weighted', weight = 0.2 } = inputs;

  const pairs: Array<{ s: number | null; t: number | null }> = [
    { s: toNum(nis2), t: toNum(trNis2) },
    { s: toNum(aiAct), t: toNum(trAiAct) },
    { s: toNum(gdpr), t: toNum(trGdpr) },
  ];

  // Blend each framework score with its training coverage
  const blended: number[] = [];
  for (const { s, t } of pairs) {
    if (s == null) continue;
    const blendedScore = mode === 'strict' 
      ? blendStrict(s, t) 
      : blendWeighted(s, t, weight);
    blended.push(blendedScore);
  }

  if (blended.length === 0) return null;
  
  const avg = blended.reduce((sum, val) => sum + val, 0) / blended.length;
  return Math.round(avg);
}
