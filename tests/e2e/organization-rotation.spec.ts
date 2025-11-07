import { test, expect } from '@playwright/test';

test.describe('Master Password Rotation - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/organization');
  });

  test('complete rotation flow and verify timestamp visibility', async ({ page }) => {
    // Open edit dialog (may trigger master password dialog)
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    // If master password dialog appears, verify with valid password
    const masterField = page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).first();
    const isMasterDialogVisible = await masterField.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isMasterDialogVisible) {
      await masterField.fill('validpassword456');
      await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
      await page.waitForTimeout(500);
    }

    // Navigate back to view mode if in edit mode
    const cancelButton = page.getByRole('button', { name: /abbrechen|cancel|avbryt/i });
    const isCancelVisible = await cancelButton.isVisible({ timeout: 500 }).catch(() => false);
    if (isCancelVisible) {
      await cancelButton.click();
      await page.waitForTimeout(300);
    }

    // Open rotation dialog
    await page.getByRole('button', { name: /ändern|change|byt.*lösenord/i }).click();
    await expect(page.getByText(/Change Master Password|Master-Passwort ändern|Byt huvudlösenord/i)).toBeVisible();

    // Fill rotation form
    await page.getByPlaceholder(/current|aktuell|nuvarande/i).fill('validpassword456');
    await page.getByPlaceholder(/new.*\(min|neu.*\(min|nytt.*\(min/i).fill('validpassword789');
    await page.getByPlaceholder(/repeat|bestätig|upprepa|bekräfta/i).fill('validpassword789');
    await page.getByRole('button', { name: /change password|passwort ändern|byt lösenord/i }).click();

    // Wait for success message
    await expect(page.getByText(/erfolgreich|success|lyckades/i)).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(500);

    // Verify "Last changed" timestamp is now visible
    await expect(page.getByText(/Zuletzt geändert|Last changed|Senast ändrad/i)).toBeVisible({ timeout: 2000 });

    // Verify old password no longer works
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill('validpassword456');
    await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
    await expect(page.getByText(/ungültig|invalid|ogiltigt/i)).toBeVisible({ timeout: 1000 });

    // Verify new password works
    await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill('validpassword789');
    await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
    await expect(page.getByRole('textbox').first()).toBeEnabled({ timeout: 2000 });
  });

  test('timestamp updates after rotation', async ({ page }) => {
    // Capture initial timestamp if visible
    const timestampLocator = page.getByText(/Zuletzt geändert|Last changed|Senast ändrad/i);
    const initialTimestampVisible = await timestampLocator.isVisible({ timeout: 1000 }).catch(() => false);
    let initialTimestamp = '';
    
    if (initialTimestampVisible) {
      initialTimestamp = await timestampLocator.textContent() || '';
    }

    // Perform rotation (assumes password is already set)
    await page.getByRole('button', { name: /ändern|change|byt.*lösenord/i }).click();
    
    await page.getByPlaceholder(/current|aktuell|nuvarande/i).fill('validpassword789');
    await page.getByPlaceholder(/new.*\(min|neu.*\(min|nytt.*\(min/i).fill('validpassword456');
    await page.getByPlaceholder(/repeat|bestätig|upprepa|bekräfta/i).fill('validpassword456');
    await page.getByRole('button', { name: /change password|passwort ändern|byt lösenord/i }).click();

    await expect(page.getByText(/erfolgreich|success|lyckades/i)).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(500);

    // Verify timestamp is now visible and different (or newly visible)
    await expect(timestampLocator).toBeVisible({ timeout: 2000 });
    const newTimestamp = await timestampLocator.textContent() || '';
    
    if (initialTimestampVisible) {
      expect(newTimestamp).not.toBe(initialTimestamp);
    }
  });
});
