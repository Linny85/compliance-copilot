import { test, expect } from '@playwright/test';

test.describe('Sidebar Navigation Labels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('DE: shows distinct labels for checks and audits', async ({ page }) => {
    // Switch to German
    await page.getByRole('button', { name: /sprache|language/i }).click();
    await page.getByText('Deutsch').click();
    
    // Wait for language change
    await page.waitForTimeout(500);
    
    // Verify distinct labels
    await expect(page.getByRole('link', { name: 'Prüfungen (auto)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible();
    
    // Ensure no duplicate "Prüfungen"
    const pruefungenLinks = page.getByRole('link', { name: /^Prüfungen$/i });
    await expect(pruefungenLinks).toHaveCount(0);
  });

  test('SV: shows distinct labels for checks and audits', async ({ page }) => {
    // Switch to Swedish
    await page.getByRole('button', { name: /sprache|language/i }).click();
    await page.getByText('Svenska').click();
    
    // Wait for language change
    await page.waitForTimeout(500);
    
    // Verify distinct labels
    await expect(page.getByRole('link', { name: 'Kontroller (auto)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible();
    
    // Ensure no duplicate "Granskningar"
    const granskningarLinks = page.getByRole('link', { name: /^Granskningar$/i });
    await expect(granskningarLinks).toHaveCount(0);
  });

  test('EN: shows distinct labels for checks and audits', async ({ page }) => {
    // Switch to English
    await page.getByRole('button', { name: /sprache|language/i }).click();
    await page.getByText('English').click();
    
    // Wait for language change
    await page.waitForTimeout(500);
    
    // Verify distinct labels
    await expect(page.getByRole('link', { name: 'Checks (auto)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audits' })).toBeVisible();
  });

  test('Navigation to /audit works correctly', async ({ page }) => {
    // Click audit link
    await page.getByRole('link', { name: /audit/i }).first().click();
    
    // Verify navigation
    await expect(page).toHaveURL(/\/audit/);
  });

  test('Navigation to /checks works correctly', async ({ page }) => {
    // Click checks link
    await page.getByRole('link', { name: /prüfungen|checks|kontroller/i }).first().click();
    
    // Verify navigation
    await expect(page).toHaveURL(/\/checks/);
  });
});
