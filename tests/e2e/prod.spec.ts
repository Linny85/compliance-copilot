import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { pdfText } from './utils/pdf';

test.describe('Prod mode – ohne Wasserzeichen', () => {
  test('Report ohne "TRIAL"', async ({ page }) => {
    await login(page);
    await page.goto('/audit');

    // Download-Event abfangen
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTitle(/Download PDF/i).click()
    ]);

    const fpath = await download.path();
    const text = await pdfText(fpath!);
    expect(text).not.toMatch(/TRIAL/);
  });
});
