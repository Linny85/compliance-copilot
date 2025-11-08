import { test, expect } from '@playwright/test';

test('loads common/dashboard namespaces without warnings', async ({ page }) => {
  const warnings: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'warning' && /i18n missing|was not yet loaded/i.test(msg.text())) {
      warnings.push(msg.text());
    }
  });

  await page.goto('/dashboard?lang=de');
  
  // Wait for tenant selector to be visible (indicates i18n loaded)
  await expect(page.getByTestId('lang-btn-de')).toBeVisible();
  
  // Give backend a moment to fetch locales
  await page.waitForTimeout(500);
  
  // Check for i18n warnings
  expect(warnings.length, `i18n warnings found:\n${warnings.join('\n')}`).toBe(0);
});

test('language detection respects URL parameter', async ({ page }) => {
  await page.goto('/dashboard?lang=en');
  
  const enButton = page.getByTestId('lang-btn-en');
  await expect(enButton).toBeVisible();
  await expect(enButton).toHaveAttribute('aria-pressed', 'true');
});

test('language persists in localStorage', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Switch to English
  await page.getByTestId('lang-btn-en').click();
  
  // Reload page
  await page.reload();
  
  // English should still be active
  const enButton = page.getByTestId('lang-btn-en');
  await expect(enButton).toHaveAttribute('aria-pressed', 'true');
});
