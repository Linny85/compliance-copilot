import { test, expect } from '@playwright/test';

test.describe('Visual: dashboard', () => {
  test('sidebar + header stable (DE)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('e2e_isAdmin', 'true'));
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot('sidebar-de.png', { animations: 'disabled' });

    const header = page.getByTestId('app-header');
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot('header-de.png', { animations: 'disabled' });
  });

  test('language switch snapshot (EN)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toHaveScreenshot('sidebar-en.png', { animations: 'disabled' });
  });
});
