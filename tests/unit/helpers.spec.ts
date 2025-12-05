import { describe, it, expect } from 'vitest';
import { toPct, toUnit, clampPct } from '@/lib/compliance/helpers';
import { deriveMetricKey } from '@/lib/checks/helpers';

describe('compliance helpers', () => {
  describe('toUnit', () => {
    it('normalisiert 0..100 auf 0..1', () => {
      expect(toUnit(50)).toBeCloseTo(0.5);
      expect(toUnit(100)).toBeCloseTo(1.0);
      expect(toUnit(0)).toBeCloseTo(0);
    });

    it('behält 0..1 Werte bei', () => {
      expect(toUnit(0.4)).toBeCloseTo(0.4);
      expect(toUnit(0.75)).toBeCloseTo(0.75);
      expect(toUnit(1.0)).toBeCloseTo(1.0);
    });

    it('behandelt null/undefined als 0', () => {
      expect(toUnit(null)).toBe(0);
      expect(toUnit(undefined)).toBe(0);
    });
  });

  describe('toPct', () => {
    it('liefert 0..100 aus 0..1', () => {
      expect(toPct(0.43)).toBe(43);
      expect(toPct(0.5)).toBe(50);
      expect(toPct(1.0)).toBe(100);
    });

    it('konvertiert Werte > 1 ebenfalls als Einheit', () => {
      expect(toPct(1.2)).toBe(120);
      expect(toPct(1.75)).toBe(175);
    });

    it('behandelt null/undefined als 0', () => {
      expect(toPct(null)).toBe(0);
      expect(toPct(undefined)).toBe(0);
    });

    it('gibt 0 für ungültige oder negative Werte zurück', () => {
      expect(toPct(-0.1)).toBe(0);
      expect(toPct(NaN)).toBe(0);
    });
  });

  describe('clampPct', () => {
    it('begrenzt auf 0..100', () => {
      expect(clampPct(101)).toBe(100);
      expect(clampPct(150)).toBe(100);
      expect(clampPct(-5)).toBe(0);
      expect(clampPct(-100)).toBe(0);
    });

    it('lässt gültige Werte unverändert', () => {
      expect(clampPct(0)).toBe(0);
      expect(clampPct(50)).toBe(50);
      expect(clampPct(100)).toBe(100);
    });
  });
});

describe('deriveMetricKey', () => {
  it('wandelt CODE in punktierte lowercase-Form', () => {
    expect(deriveMetricKey('NIS2-BACKUP-AGE')).toBe('nis2.backup.age');
    expect(deriveMetricKey('AI-ACT-TRAINING-RATE')).toBe('ai.act.training.rate');
    expect(deriveMetricKey('SIMPLE-CODE')).toBe('simple.code');
  });

  it('normalisiert Sonderzeichen zu Punkten', () => {
    expect(deriveMetricKey('AI_ACT-TRAINING.RATE')).toBe('ai.act.training.rate');
    expect(deriveMetricKey('TEST__DOUBLE--DASH')).toBe('test.double.dash');
  });

  it('entfernt führende/nachfolgende Punkte', () => {
    expect(deriveMetricKey('-START-CODE-')).toBe('start.code');
    expect(deriveMetricKey('___UNDERSCORES___')).toBe('underscores');
  });

  it('behandelt leere/ungültige Eingaben', () => {
    expect(deriveMetricKey('')).toBe('');
    expect(deriveMetricKey('---')).toBe('');
    expect(deriveMetricKey('SINGLE')).toBe('single');
  });
});
