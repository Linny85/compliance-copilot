import { readFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';
import { describe, test, expect } from 'vitest';

/**
 * Flatten nested JSON into dot-separated keys for comparison
 */
function flatten(obj: any, prefix = ''): Record<string, string | number | boolean> {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = v as any;
    }
    return acc;
  }, {} as Record<string, any>);
}

const langs = ['de', 'en', 'sv'];

describe('i18n schema validation', () => {
  // Find all de/*.json files as reference
  const deFiles = globSync('public/locales/de/*.json');

  for (const nsPath of deFiles) {
    const ns = path.basename(nsPath, '.json');

    test(`${ns} namespace has aligned keys across all locales`, () => {
      const base = JSON.parse(readFileSync(nsPath, 'utf8'));
      const baseFlat = flatten(base);
      const baseKeys = Object.keys(baseFlat).sort();

      for (const lang of langs) {
        const p = `public/locales/${lang}/${ns}.json`;
        const got = JSON.parse(readFileSync(p, 'utf8'));
        const gotFlat = flatten(got);
        const gotKeys = Object.keys(gotFlat).sort();

        // All keys must match
        expect(gotKeys).toEqual(baseKeys);

        // All values must be primitives
        for (const k of gotKeys) {
          expect(['string', 'number', 'boolean']).toContain(typeof gotFlat[k]);
        }

        // No empty strings
        for (const k of gotKeys) {
          if (typeof gotFlat[k] === 'string') {
            expect((gotFlat[k] as string).trim()).not.toHaveLength(0);
          }
        }
      }
    });
  }
});
