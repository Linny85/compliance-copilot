import { test as base } from '@playwright/test';

// Extend Playwright's test with stable env helpers
export const test = base.extend<{
  freezeTime: void;
  stubAuth: (opts?: { admin?: boolean }) => Promise<void>;
  setLocale: (lng: 'de'|'en'|'sv') => Promise<void>;
}>({
  // Freeze Date/Time so snapshots don't drift
  freezeTime: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const fixed = new Date('2025-01-01T09:00:00.000Z').valueOf();
        const _Date = Date;
        // @ts-ignore
        globalThis.Date = class extends _Date {
          constructor(...args:any[]) {
            return args.length ? new _Date(...args) : new _Date(fixed);
          }
          static now() { return fixed; }
        };
        // performance.now() stability
        const start = 42_000;
        const origPerfNow = performance.now.bind(performance);
        performance.now = () => start;
      });
      await use();
    },
    { auto: true },
  ],

  // Helper: stub auth role via your localStorage toggle
  stubAuth: async ({ page }, use) => {
    await use(async (opts?: { admin?: boolean }) => {
      const v = opts?.admin ? 'true' : 'false';
      await page.addInitScript((flag) => localStorage.setItem('e2e_isAdmin', flag), v);
    });
  },

  // Helper: set i18n language deterministically
  setLocale: async ({ page }, use) => {
    await use(async (lng: 'de'|'en'|'sv') => {
      await page.addInitScript((l) => localStorage.setItem('i18nextLng', l), lng);
    });
  },
});

export const expect = test.expect;
