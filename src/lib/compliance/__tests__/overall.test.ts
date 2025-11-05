import { describe, it, expect } from 'vitest';
import { calcOverall } from '../overall';

describe('calcOverall', () => {
  it('calculates weighted average with equal weights (default)', () => {
    const result = calcOverall([
      { key: 'nis2', score: 82 },
      { key: 'ai_act', score: 67 },
      { key: 'gdpr', score: 58 },
    ]);
    expect(result).toBe(69); // (82 + 67 + 58) / 3 = 69
  });

  it('calculates weighted average with custom weights', () => {
    const result = calcOverall([
      { key: 'nis2', score: 80, weight: 2 },
      { key: 'ai_act', score: 60, weight: 1 },
    ]);
    expect(result).toBe(73); // (80*2 + 60*1) / 3 = 73.33 → 73
  });

  it('returns null when no valid scores', () => {
    expect(calcOverall([])).toBeNull();
    expect(calcOverall([{ key: 'test', score: null }])).toBeNull();
    expect(calcOverall([{ key: 'test', score: undefined }])).toBeNull();
  });

  it('filters out null/undefined scores', () => {
    const result = calcOverall([
      { key: 'nis2', score: 80 },
      { key: 'ai_act', score: null },
      { key: 'gdpr', score: 60 },
    ]);
    expect(result).toBe(70); // (80 + 60) / 2 = 70
  });

  it('handles single framework', () => {
    const result = calcOverall([{ key: 'nis2', score: 75 }]);
    expect(result).toBe(75);
  });
});
