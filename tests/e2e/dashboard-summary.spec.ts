import { test, expect } from '@playwright/test';

test.describe('Dashboard Summary', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes auth is handled by other flows
    await page.goto('/dashboard');
  });

  test('renders compliance metrics without NaN', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check that percentage values are valid numbers (0-100%)
    const percentagePattern = /^\d+(\.\d+)?%$/;
    
    // Look for percentage displays (adjust selectors based on actual UI)
    const percentages = page.locator('[data-testid*="pct"], [aria-label*="percent"], .percentage');
    const count = await percentages.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await percentages.nth(i).innerText();
        // Should be a valid percentage or empty/placeholder
        if (text && text.includes('%')) {
          expect(text).toMatch(percentagePattern);
        }
      }
    }
  });

  test('shows single language switcher', async ({ page }) => {
    // Count language button groups (DE/EN/SV)
    const deBtns = page.getByRole('button', { name: /^DE$/i });
    const enBtns = page.getByRole('button', { name: /^EN$/i });
    const svBtns = page.getByRole('button', { name: /^SV$/i });
    
    const deCount = await deBtns.count();
    const enCount = await enBtns.count();
    const svCount = await svBtns.count();
    
    // Should have exactly 1 set of language buttons
    expect(deCount).toBe(1);
    expect(enCount).toBe(1);
    expect(svCount).toBe(1);
  });

  test('tooltips are accessible', async ({ page }) => {
    // Look for elements with tooltips (aria-describedby or title)
    const tooltipTriggers = page.locator('[aria-describedby], [title]');
    const count = await tooltipTriggers.count();
    
    if (count > 0) {
      // Hover over first element to verify tooltip appears
      await tooltipTriggers.first().hover();
      await page.waitForTimeout(300); // Wait for tooltip to appear
      
      // Check that tooltip content is not 'undefined' or empty
      const tooltip = page.locator('[role="tooltip"]').first();
      if (await tooltip.isVisible()) {
        const text = await tooltip.innerText();
        expect(text).toBeTruthy();
        expect(text).not.toContain('undefined');
      }
    }
  });
});
