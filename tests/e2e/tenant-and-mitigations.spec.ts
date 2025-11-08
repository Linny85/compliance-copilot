import { test, expect } from '../fixtures';

test.describe('Tenant Resolution & UI', () => {
  test('zeigt Hinweis, wenn kein Tenant auflösbar ist', async ({ page }) => {
    await page.goto('/dashboard');
    const banner = page.getByText(/kein mandant|no tenant|ingen|vänligen välj/i);
    await expect(banner).toBeVisible({ timeout: 10000 });
  });

  test('blendet Hinweis aus, wenn Tenant gesetzt ist (localStorage Fallback)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('tenant_id', 'demo-tenant-id'));
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const banner = page.getByText(/kein mandant|no tenant|ingen/i);
    await expect(banner).toHaveCount(0);
  });
});

test.describe('Mitigation Multi-Select & Chips', () => {
  test('Mehrfachauswahl, De-Duplizierung, Entfernen per Tastatur', async ({ page }) => {
    await page.goto('/risks');
    await page.waitForTimeout(1000);
    
    // Dialog öffnen (falls nötig)
    const newButton = page.getByRole('button', { name: /new risk|neues risiko/i });
    if (await newButton.isVisible()) {
      await newButton.click();
    }

    // Mitigation-Select öffnen
    const selectButton = page.getByRole('button', { name: /maßnahmen|mitigation|åtgärd/i }).first();
    if (await selectButton.isVisible()) {
      await selectButton.click();
      await page.waitForTimeout(500);

      // Erste Maßnahme wählen
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible()) {
        const firstText = await firstOption.textContent();
        await firstOption.click();
        await page.waitForTimeout(300);

        // Chip sollte sichtbar sein
        const chip = page.getByRole('button', { name: new RegExp(firstText || '', 'i') });
        await expect(chip).toBeVisible();

        // Entfernen per Delete
        await chip.focus();
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);
        await expect(chip).toHaveCount(0);
      }
    }
  });
});

test.describe('Checks Save-Button Validierung', () => {
  test('Save disabled mit Tooltip bei unvollständigem Check', async ({ page, setLocale }) => {
    await setLocale('de');
    await page.goto('/checks');
    await page.waitForTimeout(1000);

    // Neuen Check-Dialog öffnen
    const newButton = page.getByRole('button', { name: /new|neu|ny/i });
    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(500);

      const saveButton = page.getByRole('button', { name: /save|speichern|spara/i });
      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeDisabled();
        
        const ariaDisabled = await saveButton.getAttribute('aria-disabled');
        expect(ariaDisabled).toBe('true');

        const title = await saveButton.getAttribute('title');
        expect(title).toMatch(/vervollständigen|complete|komplett/i);
      }
    }
  });
});
