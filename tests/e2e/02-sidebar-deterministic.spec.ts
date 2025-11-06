import { test, expect } from '@playwright/test';

// helper to count sidebar items by testid prefix
async function countSidebar(page: any) {
  const items = page.locator('[data-testid^="nav-item-"]');
  return await items.count();
}

test('sidebar has 13 items for non-admin', async ({ page }) => {
  // ensure non-admin in DEV (adapt if your app uses session)
  await page.addInitScript(() => localStorage.setItem('e2e_isAdmin', 'false'));
  await page.goto('/dashboard');
  await expect(page.locator('body')).toBeVisible();
  const count = await countSidebar(page);
  expect(count).toBe(13);
});

test('sidebar has 14 items for admin', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('e2e_isAdmin', 'true'));
  await page.goto('/dashboard');
  const count = await countSidebar(page);
  expect(count).toBe(14);
});
