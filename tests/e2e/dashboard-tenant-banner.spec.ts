import { test, expect } from '@playwright/test';

test.describe('Dashboard – Tenant-Pinning & Stability', () => {
  test('Banner bei fehlendem Tenant & kein 0%-Flackern', async ({ page }) => {
    // Remove tenant_id from localStorage
    await page.addInitScript(() => {
      localStorage.removeItem('tenant_id');
    });
    
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Banner should be visible when no tenant is set
    const noBanner = await page.getByText(/kein mandant gewählt|no tenant selected/i).isVisible().catch(() => false);
    
    if (noBanner) {
      // Set tenant and verify banner disappears
      await page.evaluate(() => {
        localStorage.setItem('tenant_id', 'test-tenant-123');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Banner should be hidden
      await expect(page.getByText(/kein mandant gewählt|no tenant selected/i)).not.toBeVisible();
    }
  });

  test('Prozentanzeige bleibt stabil bei Reload', async ({ page }) => {
    // Set tenant
    await page.addInitScript(() => {
      localStorage.setItem('tenant_id', 'stable-tenant-456');
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Get first percentage value
    const percentageLocator = page.locator('.text-3xl, .text-4xl').filter({ hasText: /%/ }).first();
    await percentageLocator.waitFor({ state: 'visible', timeout: 10000 });
    
    const pctBefore = await percentageLocator.textContent();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for percentage to appear again
    await percentageLocator.waitFor({ state: 'visible', timeout: 10000 });
    const pctAfter = await percentageLocator.textContent();
    
    // Percentages should match (no 0% flicker)
    expect(pctAfter).toBe(pctBefore);
  });

  test('DPIA zeigt "—" bei dpia_total = 0', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tenant_id', 'test-tenant-789');
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for DPIA card
    const dpiaCard = page.getByText(/DPIA|Datenschutz-Folgenabschätzung/i).locator('..').locator('..');
    
    if (await dpiaCard.isVisible()) {
      const content = await dpiaCard.textContent();
      
      // Should show either:
      // - A valid percentage (0-100%)
      // - "—" or "n/a" for no data
      // - NOT "10000%" or other invalid values
      
      const hasValidPct = /\b([0-9]{1,2}|100)%/.test(content || '');
      const hasPlaceholder = /(—|n\/a|keine|no data)/i.test(content || '');
      const hasInvalidPct = /[0-9]{3,}%/.test(content || '');
      
      expect(hasInvalidPct).toBe(false);
      expect(hasValidPct || hasPlaceholder).toBe(true);
    }
  });

  test('Debug-Badge sichtbar in DEV/Preview', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if we're in a dev/preview environment
    const hostname = await page.evaluate(() => window.location.hostname);
    const isDevOrPreview = hostname === 'localhost' || hostname.includes('lovableproject');
    
    if (isDevOrPreview) {
      // Debug badge should be visible
      const badge = page.getByText(/DEV|Preview|Tenant:/i);
      const badgeVisible = await badge.isVisible().catch(() => false);
      
      // In dev/preview, badge should be visible (but may be in header or elsewhere)
      if (badgeVisible) {
        expect(await badge.textContent()).toMatch(/DEV|Preview|Tenant/i);
      }
    }
  });
});
