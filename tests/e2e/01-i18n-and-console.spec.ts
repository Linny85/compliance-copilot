import { test, expect } from '@playwright/test';

test('no i18n parse errors or double mount warnings', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (/(JSON parse failed|I18nProvider.*doppelt|double mount)/i.test(t)) {
      errors.push(t);
    }
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  // basic content sanity
  await expect(page).toHaveTitle(/.+/);

  // assert: zero noisy warnings
  expect(errors, errors.join('\n')).toHaveLength(0);
});
