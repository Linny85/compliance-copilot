/**
 * Compliance Score Calculation
 * 
 * Calculates overall compliance score based on:
 * - Controls pass rate (50%)
 * - Evidence completion (20%)
 * - Training completion (10%)
 * - DPIA completion (20%)
 */

export type ScoreVariant = 'success' | 'warning' | 'destructive';

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
export function getScoreColor(score: number): ScoreVariant {
  if (score >= 0.80) return 'success';
  if (score >= 0.50) return 'warning';
  return 'destructive';
}

/**
 * Format score as percentage
 */
export function formatScore(score: number): string {
  return `${Math.round((score ?? 0) * 100)}%`;
}

export const FRAMEWORK_CODES = {
  NIS2: 'NIS2',
  AI_ACT: 'AI_ACT',
  GDPR: 'GDPR',
} as const;

export type FrameworkCode = typeof FRAMEWORK_CODES[keyof typeof FRAMEWORK_CODES];

export interface VComplianceSummaryRow {
  tenant_id: string;
  overall_score: number | null;
  controls_score: number | null;
  evidence_score: number | null;
  training_score: number | null;
  dpia_score: number | null;
  dpia_total?: number;
  // Framework scores extracted from JSON (0..1 range)
  nis2?: number | null;
  aiAct?: number | null;
  gdpr?: number | null;
}

export interface VFrameworkComplianceRow {
  tenant_id: string;
  framework: 'NIS2' | 'AI_ACT' | 'GDPR' | string;
  score: number | null;
}

export interface TrendData {
  cur_score: number | null;
  prev_score: number | null;
  delta_score: number | null;
}
