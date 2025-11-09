import { test, expect } from '@playwright/test';

test.describe('Dashboard Summary', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes auth is handled by other flows
    await page.goto('/dashboard');
  });

  test('renders compliance metrics without NaN', async ({ page }) => {
    // Wait for compliance progress card
    await expect(page.getByText(/Compliance/i).first()).toBeVisible();
    
    // Overall percentage should be valid
    const overallPct = page.locator('[data-testid="overall-pct"]');
    await expect(overallPct).toBeVisible();
    const overallText = await overallPct.innerText();
    expect(overallText).toMatch(/^\d+%$/);
    expect(overallText).not.toContain('NaN');
    
    // Framework percentages should be valid
    const nis2Badge = page.locator('[data-testid="nis2-pct"]');
    const aiBadge = page.locator('[data-testid="ai-pct"]');
    const gdprBadge = page.locator('[data-testid="gdpr-pct"]');
    
    for (const badge of [nis2Badge, aiBadge, gdprBadge]) {
      await expect(badge).toBeVisible();
      const text = await badge.innerText();
      expect(text).toMatch(/\d+%/);
      expect(text).not.toContain('NaN');
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
