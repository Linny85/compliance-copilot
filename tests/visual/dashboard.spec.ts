import { test, expect } from '../fixtures';

test.describe('Visual: dashboard', () => {
  test('sidebar + header stable (DE)', async ({ page, stubAuth, setLocale }) => {
    await stubAuth({ admin: true });
    await setLocale('de');
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const mask = [
      page.locator('[data-testid="build-ts"]'),
      page.locator('[data-testid="user-avatar"]'),
      page.locator('[data-testid="badge-count"]'),
    ];

    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot('sidebar-de.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      mask,
    });

    const header = page.getByTestId('app-header');
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot('header-de.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      mask,
    });
  });

  test('language switch snapshot (EN)', async ({ page, stubAuth, setLocale }) => {
    await stubAuth({ admin: true });
    await setLocale('en');
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    const mask = [
      page.locator('[data-testid="build-ts"]'),
      page.locator('[data-testid="user-avatar"]'),
      page.locator('[data-testid="badge-count"]'),
    ];

    const sidebar = page.getByTestId('app-sidebar');
    await expect(sidebar).toHaveScreenshot('sidebar-en.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      mask,
    });
  });
});
