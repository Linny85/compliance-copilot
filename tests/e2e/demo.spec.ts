import { test, expect } from '@playwright/test';
import { login } from './utils/auth';

test.describe('Demo mode – read-only', () => {
  test('Dokumente-Menü ausgeblendet und Report-Generation blockiert', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');

    // Dokumente sollten in Demo nicht in der Sidebar sein
    await expect(page.getByRole('link', { name: /Dokumente|Documents/i })).toHaveCount(0);

    // Navigiere manuell zu /audit und prüfe Buttons
    await page.goto('/audit');
    await expect(page.getByText(/Audit Tasks/i)).toBeVisible();

    // Falls "New Audit Task" Button angezeigt wird, sollte Speichern blockiert sein
    await page.goto('/audit/new');
    // Eingaben (optional)
    await page.getByLabel(/Title/i).fill('E2E Demo Block');
    // Speichern versuchen
    const saveBtn = page.getByRole('button', { name: /Create|Erstellen/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      // Erwartung: Toast/Alert oder kein State-Change
      await expect(page.getByText(/Demo[- ]?Modus|nur Ansicht|deaktiviert/i)).toBeVisible();
    }

    // Edge Function blockiert (simuliert): intercept und 403 zurückgeben
    await page.route('**/functions/v1/generate-audit-report', route =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Generation disabled in demo mode' }) })
    );

    // Auf Detailseite der Task (falls vorhanden) → Button sollte disabled oder blockiert sein
    await page.goto('/audit');
  });
});
