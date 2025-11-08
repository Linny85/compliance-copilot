import { test, expect } from '@playwright/test';

test.describe('Dashboard Compliance Display', () => {
  test('shows stable percentage values (no flicker to 0%)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for compliance card to load
    await page.waitForSelector('text=/Compliance|Einhaltung|Efterlevnad/i', { timeout: 5000 });
    
    // Find any percentage value
    const pctRegex = /\b(\d{1,3})\s?%/;
    const pctElement = page.locator('text=' + pctRegex.source).first();
    await expect(pctElement).toBeVisible({ timeout: 3000 });
    
    const beforeText = await pctElement.textContent();
    
    // Reload page
    await page.reload();
    await page.waitForSelector('text=/Compliance|Einhaltung|Efterlevnad/i', { timeout: 5000 });
    
    const afterText = await pctElement.textContent();
    
    // Values should stay consistent (no sudden drop to 0%)
    if (beforeText && afterText) {
      const beforeMatch = beforeText.match(/(\d+)/);
      const afterMatch = afterText.match(/(\d+)/);
      
      if (beforeMatch && afterMatch) {
        const beforeVal = parseInt(beforeMatch[1]);
        const afterVal = parseInt(afterMatch[1]);
        
        // Allow small variance but no drop to 0
        if (beforeVal > 0) {
          expect(afterVal).toBeGreaterThan(0);
        }
      }
    }
  });

  test('always shows percentage (never dash or empty)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for compliance section
    await page.waitForSelector('text=/Compliance|Einhaltung|Efterlevnad/i', { timeout: 5000 });
    
    // Should show percentage values, not dashes
    const percentages = page.locator('text=/\\d+\\s?%/');
    await expect(percentages.first()).toBeVisible({ timeout: 3000 });
    
    // Should not show placeholder dashes
    const noDashes = page.locator('text="—"').first();
    const dashCount = await noDashes.count();
    
    // Some dashes might be acceptable in other sections, 
    // but compliance scores should show numbers
    const complianceSection = page.locator('[class*="compliance"]').first();
    if (await complianceSection.isVisible()) {
      const dashesInCompliance = complianceSection.locator('text="—"');
      expect(await dashesInCompliance.count()).toBe(0);
    }
  });

  test('framework badges show valid percentages', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.waitForSelector('text=/Compliance|Einhaltung|Efterlevnad/i', { timeout: 5000 });
    
    // Look for framework names (NIS2, AI Act, GDPR)
    const frameworks = ['NIS2', 'AI Act', 'GDPR', 'AI-ACT'];
    
    for (const fw of frameworks) {
      const badge = page.locator(`text=${fw}`).first();
      if (await badge.isVisible()) {
        // Near each framework name, there should be a percentage
        const parent = badge.locator('..');
        const pct = parent.locator('text=/\\d+%/');
        await expect(pct).toBeVisible({ timeout: 1000 });
      }
    }
  });
});
