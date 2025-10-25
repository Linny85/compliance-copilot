/**
 * Compliance Score Calculation
 * 
 * Calculates overall compliance score based on:
 * - Controls pass rate (50%)
 * - Evidence completion (20%)
 * - Training completion (10%)
 * - DPIA completion (20%)
 */

export interface ComplianceScoreData {
  overall: number;
  nis2: number;
  aiAct: number;
  gdpr: number;
  breakdown: {
    controls: number;
    evidence: number;
    training: number;
    dpia: number;
  };
}

export interface ComplianceMetrics {
  overallScore: number;
  frameworkScores: {
    nis2: number;
    aiAct: number;
    gdpr: number;
  };
  breakdown: {
    controls: number;
    evidence: number;
    training: number;
    dpia: number;
  };
}

export interface OpenTask {
  title: string;
  due_at: string | null;
  link: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'evidence' | 'dpia' | 'training' | 'check';
}

/**
 * Calculate compliance score with configurable weights
 */
export function calculateComplianceScore(
  controlsScore: number = 0,
  evidenceScore: number = 0,
  trainingScore: number = 0,
  dpiaScore: number = 0,
  weights = { controls: 0.5, evidence: 0.2, training: 0.1, dpia: 0.2 }
): number {
  return (
    controlsScore * weights.controls +
    evidenceScore * weights.evidence +
    trainingScore * weights.training +
    dpiaScore * weights.dpia
  );
}

/**
 * Get traffic light color based on score
 */
export function getScoreColor(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 0.80) return 'success';
  if (score >= 0.50) return 'warning';
  return 'destructive';
}

/**
 * Format score as percentage
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}
