import { test, expect } from '@playwright/test';

test('language switcher buttons exist and are clickable', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('lang-btn-de')).toBeVisible();
  await expect(page.getByTestId('lang-btn-en')).toBeVisible();
  await expect(page.getByTestId('lang-btn-sv')).toBeVisible();

  // Klick auf EN (ohne strenge Text-Asserts, da Labels je nach Namespace variieren können)
  await page.getByTestId('lang-btn-en').click();

  // Beispiel: nav-dashboard ändert sich (falls du den Label-Test später aktivierst)
  const dash = page.getByTestId('nav-item-dashboard');
  await expect(dash).toBeVisible();
});
