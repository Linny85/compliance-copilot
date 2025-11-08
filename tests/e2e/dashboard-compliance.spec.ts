import { test, expect } from '@playwright/test';

test.describe('Dashboard Compliance Display', () => {
  test('Compliance percentage stays stable after reload', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for compliance card to load
    await page.waitForSelector('text=Compliance Progress', { timeout: 10000 });
    
    // Get the overall percentage displayed
    const overallText = await page.locator('text=/\\d+%/').filter({ hasText: /^\d+%$/ }).first().textContent();
    const percentBefore = overallText?.match(/\d+/)?.[0];
    
    // Reload page
    await page.reload();
    await page.waitForSelector('text=Compliance Progress', { timeout: 10000 });
    
    // Get percentage after reload
    const overallTextAfter = await page.locator('text=/\\d+%/').filter({ hasText: /^\d+%$/ }).first().textContent();
    const percentAfter = overallTextAfter?.match(/\d+/)?.[0];
    
    // Values should be identical (no flicker to 0)
    expect(percentBefore).toBe(percentAfter);
  });

  test('Always shows percentage values, never dashes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Compliance Progress', { timeout: 10000 });
    
    // Check that compliance section doesn't contain placeholder dashes
    const complianceSection = page.locator('text=Compliance Progress').locator('..');
    const hasDash = await complianceSection.locator('text="—"').count();
    
    // Should not show "—" in overall percentage display (only in evidence/dpia if no data)
    const overallSection = page.locator('text=/Overall|Gesamt|Totalt/').locator('..');
    const overallHasDash = await overallSection.locator('text="—"').count();
    expect(overallHasDash).toBe(0);
  });

  test('Framework badges show valid percentages', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Compliance Progress', { timeout: 10000 });
    
    // Check that core framework badges are present and show percentages
    const frameworks = ['NIS2', 'AI Act', 'GDPR'];
    
    for (const framework of frameworks) {
      const badge = page.locator(`text=/^${framework}:/`);
      await expect(badge).toBeVisible();
      
      // Badge should contain a percentage
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/\d+%/);
    }
  });
});
