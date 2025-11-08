import { test, expect } from '@playwright/test';

test.describe('Checks dialog – quick wins', () => {
  test('Live-Validierung, metric_key-Ableitung, Advanced-Collapsible', async ({ page }) => {
    await page.goto('/checks/new');

    // Fill title
    const titleInput = page.getByLabel(/titel|title/i).first();
    await titleInput.fill('Backup-Alter prüfen');

    // Fill code
    const codeInput = page.getByLabel(/^code$/i);
    await codeInput.fill('NIS2-BACKUP-AGE');

    // Wait for metric_key to be auto-derived
    await page.waitForTimeout(500);

    // metric_key should be automatically derived
    const metricInput = page.getByLabel(/metric.?key|metrischer schlüssel/i);
    await expect(metricInput).toHaveValue(/nis2\.backup\.age/i);

    // Advanced section should be collapsible
    const advancedTrigger = page.getByRole('button', { name: /erweiterte einstellungen|advanced settings/i });
    
    // Initially expanded or collapsed - toggle to expand
    await advancedTrigger.click();
    await page.waitForTimeout(300);
    
    // Check if governance section is visible
    const governanceVisible = await page.getByText(/governance|metriken/i).isVisible();
    
    // Toggle again
    await advancedTrigger.click();
    await page.waitForTimeout(300);
    
    // State should have changed
    const governanceVisible2 = await page.getByText(/governance|metriken/i).isVisible();
    expect(governanceVisible).not.toBe(governanceVisible2);

    // Fill specification fields
    const queryInput = page.getByLabel(/abfrage|query/i);
    await queryInput.fill('system.dataRetention.days');

    const operatorSelect = page.getByLabel(/operator/i);
    await operatorSelect.selectOption({ label: /gte|≥/i });

    const valueInput = page.getByLabel(/^wert$|^value$/i).last();
    await valueInput.fill('30');

    // Validation status should show "valid"
    await expect(page.getByText(/✓.*gültig|✓.*valid/i)).toBeVisible();

    // Save button should be enabled
    const saveButton = page.getByRole('button', { name: /speichern|save|erstellen|create/i });
    await expect(saveButton).toBeEnabled();
  });

  test('Manuelle Änderung von metric_key verhindert Überschreiben', async ({ page }) => {
    await page.goto('/checks/new');
    
    // Fill code
    const codeInput = page.getByLabel(/^code$/i);
    await codeInput.fill('NIS2-BACKUP-AGE');
    
    await page.waitForTimeout(500);
    
    // Manually change metric_key
    const metricInput = page.getByLabel(/metric.?key|metrischer schlüssel/i);
    await metricInput.clear();
    await metricInput.fill('custom.key');
    
    // Change code - metric_key should NOT be overwritten
    await codeInput.clear();
    await codeInput.fill('NIS2-BACKUP-MAX');
    
    await page.waitForTimeout(500);
    
    // Verify metric_key remains manual value
    await expect(metricInput).toHaveValue('custom.key');
  });

  test('Ungültiger Code blockiert Speichern', async ({ page }) => {
    await page.goto('/checks/new');
    
    const titleInput = page.getByLabel(/titel|title/i).first();
    await titleInput.fill('Test Rule');
    
    // Enter invalid code (lowercase, spaces)
    const codeInput = page.getByLabel(/^code$/i);
    await codeInput.fill('invalid code 123');
    
    // Fill other required fields
    const queryInput = page.getByLabel(/abfrage|query/i);
    await queryInput.fill('system.test');
    
    const valueInput = page.getByLabel(/^wert$|^value$/i).last();
    await valueInput.fill('1');
    
    // Validation should show error
    await expect(page.getByText(/✖.*fehler|✖.*error|⚠.*unvollständig|⚠.*incomplete/i)).toBeVisible();
    
    // Save button should be disabled or show validation error
    const saveButton = page.getByRole('button', { name: /speichern|save|erstellen|create/i });
    const isDisabled = await saveButton.isDisabled();
    const hasError = await page.getByText(/code.*bindestrich|code.*hyphen|code.*a-z.*0-9/i).isVisible();
    
    expect(isDisabled || hasError).toBeTruthy();
  });

  test('Wechsel zwischen static und query behält Werte', async ({ page }) => {
    await page.goto('/checks/new');
    
    // Fill basic info
    const titleInput = page.getByLabel(/titel|title/i).first();
    await titleInput.fill('Test Rule');
    
    const codeInput = page.getByLabel(/^code$/i);
    await codeInput.fill('TEST-RULE-1');
    
    // Fill query specification
    const queryInput = page.getByLabel(/abfrage|query/i);
    await queryInput.fill('system.test.value');
    
    const valueInput = page.getByLabel(/^wert$|^value$/i).last();
    await valueInput.fill('42');
    
    // Remember values
    const queryValue = await queryInput.inputValue();
    const testValue = await valueInput.inputValue();
    
    // Switch kind (if toggle exists)
    const kindToggle = page.getByRole('combobox', { name: /art|kind|type/i });
    if (await kindToggle.isVisible()) {
      await kindToggle.selectOption({ index: 1 });
      await kindToggle.selectOption({ index: 0 });
      
      // Values should be preserved
      await expect(queryInput).toHaveValue(queryValue);
      await expect(valueInput).toHaveValue(testValue);
    }
  });
});
