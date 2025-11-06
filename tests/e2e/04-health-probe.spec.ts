import { test, expect } from '@playwright/test';

test('health probe reports ok and i18n ready', async ({ page }) => {
  await page.goto('/debug/health');
  const pre = page.getByTestId('debug-health-json');
  const json = JSON.parse(await pre.textContent() || '{}');

  expect(json.ok).toBe(true);
  expect(json.i18n.ready).toBeTruthy();
  expect(json.build.tracer).toBeTruthy(); // fetch tracer active in DEV
});
