import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/nis2', name: 'nis2' },
];

const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
};

for (const pageDef of PAGES) {
  for (const [vpName, viewport] of Object.entries(viewports)) {
    test(`${pageDef.name} centered @ ${vpName}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(pageDef.path, { waitUntil: 'networkidle' });

      const root = page.getByTestId('page-root');
      await expect(root).toBeVisible();

      // 1) Keine horizontale Scrollbar
      const noOverflow = await page.evaluate(() =>
        document.scrollingElement!.scrollWidth <= window.innerWidth
      );
      expect(noOverflow).toBeTruthy();

      // 2) Max-Breite <= 1280 und Inhalt zentriert
      const box = await root.boundingBox();
      if (!box) throw new Error('no bounding box');
      const vpWidth = viewport.width;
      expect(box.width).toBeLessThanOrEqual(1280 + 1);

      const centerDelta = Math.abs((box.x + box.width / 2) - (vpWidth / 2));
      expect(centerDelta).toBeLessThanOrEqual(8); // <= 8px von der Mitte

      // 3) Visueller Snapshot
      await expect(page).toHaveScreenshot(`${pageDef.name}-${vpName}.png`, { maxDiffPixels: 200 });
    });
  }
}

// Speziell: NIS2 Empty-State mittig
test('nis2 empty-state centered', async ({ page }) => {
  await page.setViewportSize(viewports.tablet);
  await page.goto('/nis2', { waitUntil: 'networkidle' });

  const empty = page.getByTestId('empty-state');
  await expect(empty).toBeVisible();

  const box = await empty.boundingBox();
  if (!box) throw new Error('no empty-state bounding box');
  const vpWidth = viewports.tablet.width;
  const delta = Math.abs((box.x + box.width / 2) - (vpWidth / 2));
  expect(delta).toBeLessThanOrEqual(8);
});
