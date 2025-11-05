/**
 * Overall Compliance Score Calculation
 * Computes weighted average across multiple frameworks
 */

export type FrameworkScore = {
  key: string;
  score: number | null | undefined;
  weight?: number | null | undefined;
};

/**
 * Calculate overall compliance score from framework scores
 * @param frameworks Array of framework scores with optional weights
 * @returns Overall score (0-100) or null if no valid scores
 */
export function calcOverall(frameworks: FrameworkScore[]): number | null {
  const valid = frameworks.filter(
    (f) => typeof f?.score === 'number' && f.score >= 0
  );
  
  if (valid.length === 0) return null;
  
  const totalWeight = valid.reduce((sum, f) => sum + (Number(f.weight) || 1), 0);
  if (!totalWeight) return null;
  
  const weighted = valid.reduce(
    (sum, f) => sum + (Number(f.score) * (Number(f.weight) || 1)),
    0
  );
  
  return Math.round(weighted / totalWeight);
}
