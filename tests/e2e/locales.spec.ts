import { test, expect } from '@playwright/test';

test.describe('i18n locale files', () => {
  const langs = ['de', 'en', 'sv'];
  const namespaces = ['common', 'dashboard', 'norrly', 'training', 'labels', 'sections'];

  for (const lang of langs) {
    for (const ns of namespaces) {
      test(`${lang}/${ns}.json is served correctly`, async ({ page }) => {
        const res = await page.request.get(`/locales/${lang}/${ns}.json`);
        
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toMatch(/application\/json/);
        
        const body = await res.json();
        expect(body).toBeDefined();
        expect(typeof body).toBe('object');
      });
    }
  }

  test('dashboard displays translated content', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show translated welcome text (any language)
    await expect(page.getByText(/Willkommen|Welcome|Välkommen/)).toBeVisible({ timeout: 10000 });
  });
});
