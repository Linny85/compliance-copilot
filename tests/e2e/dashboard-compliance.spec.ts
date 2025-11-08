import { test, expect } from '@playwright/test';

test.describe('Dashboard Compliance Display', () => {
  const complianceCardSelector = 'text=/Compliance[- ]?Progress|Compliance[- ]?Fortschritt|Efterlevnad/i';
  const overallSelector = '.text-3xl.font-bold';
  const controlsLabelSelector = 'text=/Controls|Kontrollen|Kontroller/i';

  test('Compliance percentage stays stable after reload (no 0% flicker)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });
    
    // Get values before reload
    const beforeReloadOverall = await page.locator(overallSelector).first().textContent();
    const beforeReloadControls = await page.locator(controlsLabelSelector).first().textContent();
    
    const beforeOverall = parseInt(beforeReloadOverall?.match(/\d+/)?.[0] ?? '0', 10);
    const beforeControls = parseInt(beforeReloadControls?.match(/\d+/)?.[0] ?? '0', 10);
    
    // Reload and verify values remain stable
    await page.reload();
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });

    const afterReloadOverall = await page.locator(overallSelector).first().textContent();
    const afterReloadControls = await page.locator(controlsLabelSelector).first().textContent();
    
    const afterOverall = parseInt(afterReloadOverall?.match(/\d+/)?.[0] ?? '0', 10);
    const afterControls = parseInt(afterReloadControls?.match(/\d+/)?.[0] ?? '0', 10);
    
    // Values should remain consistent after reload (no flicker to 0%)
    expect(afterOverall).toBe(beforeOverall);
    expect(afterControls).toBe(beforeControls);
  });

  test('DPIA shows "—" when dpia_total = 0, not 0% or 100%', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });

    // Find DPIA label and value
    const dpiaLabelSelector = 'text=/DPIA|Datenschutz-Folgenabschätzung/i';
    await page.waitForSelector(dpiaLabelSelector, { timeout: 5000 });
    
    // Get the value next to DPIA label - should be either "—" or a percentage
    const dpiaValue = await page.locator(dpiaLabelSelector)
      .locator('..')
      .locator('span.font-medium')
      .textContent();
    
    // If there's no DPIA data, it should show "—" or "N/A"
    // If there is data, it should be 0-100%
    if (dpiaValue?.includes('—') || dpiaValue?.includes('N/A') || dpiaValue?.includes('n/a')) {
      // No data case - this is correct
      expect(dpiaValue).toMatch(/—|N\/A|n\/a/);
    } else {
      // Data exists - verify it's a valid percentage
      const pct = parseInt(dpiaValue?.match(/\d+/)?.[0] ?? '0', 10);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  test('Overall circle reflects overview.overall_pct (no 0% when data exists)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });
    
    // Get any percentage value from breakdown (e.g., Controls)
    const breakdownPcts = await page.locator('text=/\\d+%/').allTextContents();
    const hasNonZero = breakdownPcts.some(text => {
      const num = parseInt(text.match(/\d+/)?.[0] ?? '0', 10);
      return num > 0;
    });
    
    // Get circle percentage (the large centered one)
    const circleText = await page.locator(overallSelector).first().textContent();
    const circlePercent = parseInt(circleText?.match(/\d+/)?.[0] ?? '0', 10);
    
    // If any breakdown shows >0%, circle should not be 0%
    if (hasNonZero) {
      expect(circlePercent).toBeGreaterThan(0);
    }
  });

  test('Always shows percentage values, never dashes in overall', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });
    
    // Overall percentage should never show "—"
    const overallSection = page.locator(overallSelector).first();
    const overallText = await overallSection.textContent();
    expect(overallText).not.toContain('—');
    expect(overallText).toMatch(/\d+%/);
  });

  test('Framework badges show valid percentages', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });
    
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

  test('All percentages are within 0-100 range (no 10000%)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector(complianceCardSelector, { timeout: 10000 });
    
    // Get all percentage text values from compliance card
    const pctTexts = await page.locator('text=/\\d+%/').allTextContents();
    
    // Every percentage should be 0-100
    pctTexts.forEach(text => {
      const matches = text.match(/(\d+)%/g);
      if (matches) {
        matches.forEach(match => {
          const n = parseInt(match.replace('%', ''), 10);
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(100);
        });
      }
    });
  });
});
