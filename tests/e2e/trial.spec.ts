import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { pdfText } from './utils/pdf';

test.describe('Trial mode – voll funktionsfähig mit Wasserzeichen', () => {
  test('Report generieren + Download enthält "TRIAL"', async ({ page }) => {
    await login(page);
    await page.goto('/audit/new');

    await page.getByLabel(/Title/i).fill('E2E Trial Report');
    await page.getByRole('button', { name: /Create|Erstellen/i }).click();
    await expect(page.getByText(/Audit Tasks|Created|Erstellt/)).toBeVisible();

    // Öffne erste Zeile (neueste)
    await page.click('table tr >> nth=1');

    // Intercept: erfolgreiche Function-Antwort simulieren (inkl. Pfad)
    await page.route('**/functions/v1/generate-audit-report', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, file_path: 'tenant-x/audit_fake.pdf' }),
      });
    });

    // Download-Event abfangen und PDF-Text prüfen
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Generate|Bericht|Report|Download/i }).click(),
    ]);

    const path = await download.path();
    expect(path).toBeTruthy();

    // PDF-Text extrahieren und auf TRIAL-Wasserzeichen prüfen
    const text = await pdfText(path!);
    expect(text).toMatch(/TRIAL/i);
  });
});
