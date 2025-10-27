// Datei: tests/norrly.intent.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Norrly – Intent Navigation', () => {
  test('DE: Unternehmensdaten → Confirm → navigiert zu /company-profile', async ({ page }) => {
    await page.goto('/');
    // Floating Button öffnen – passe Selector an dein UI an:
    await page.getByRole('button', { name: /norrland guide|norrly/i }).click();

    // Frage stellen
    await page.getByRole('textbox').fill('Wo trage ich meine Unternehmensdaten ein?');
    await page.keyboard.press('Enter');

    // Bestätigungsleiste taucht auf
    await expect(page.getByText('/company-profile')).toBeVisible({ timeout: 5000 });

    // Öffnen
    await page.getByRole('button', { name: /öffnen|open/i }).first().click();
    await expect(page).toHaveURL(/\/company-profile$/);
  });

  test('Cancel blendet Leiste aus', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /norrly/i }).click();
    await page.getByRole('textbox').fill('Wo trage ich meine Unternehmensdaten ein?');
    await page.keyboard.press('Enter');
    await expect(page.getByText('/company-profile')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /abbrechen|cancel/i }).click();
    await expect(page.getByText('/company-profile')).toBeHidden();
  });
});
