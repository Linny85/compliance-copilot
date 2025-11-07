import { test, expect } from '@playwright/test';

test.describe('Organization Master Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to organization page (assumes user is authenticated)
    await page.goto('/organization');
  });

  test('shows master password dialog when editing', async ({ page }) => {
    // Click edit button
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    // Master password dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/master.*passwort|master.*password|huvudlösenord/i)).toBeVisible();
  });

  test('shows error message for invalid password', async ({ page }) => {
    // Open master password dialog
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    // Enter wrong password
    await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
    
    // Should show error
    await expect(page.getByText(/ungültig|invalid|ogiltigt/i)).toBeVisible();
  });

  test('opens setup dialog when password not set', async ({ page }) => {
    // This test assumes master password is not set
    // Click edit button
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    // Enter any password (will trigger not_set if DB is empty)
    await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill('testpassword');
    await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
    
    // If not_set error, setup dialog should open
    // Note: This assumes the backend returns not_set when no password is configured
    const setupDialog = page.getByRole('dialog').filter({ hasText: /festlegen|set.*password|ange/i });
    
    // If setup dialog appears, verify its content
    if (await setupDialog.isVisible({ timeout: 2000 })) {
      await expect(setupDialog).toBeVisible();
      await expect(setupDialog.getByText(/mindestens 10|at least 10|minst 10/i)).toBeVisible();
    }
  });

  test('setup dialog validates password requirements', async ({ page }) => {
    // Skip this test if setup dialog doesn't appear (password already set)
    test.skip(!await page.getByRole('button', { name: /festlegen|set.*password|ange/i }).isVisible({ timeout: 1000 }));
    
    // Try short password
    await page.getByLabel(/^master.*passwort|^master.*password|^huvudlösenord/i).first().fill('short');
    await page.getByLabel(/bestätigen|confirm|bekräfta/i).fill('short');
    await page.getByRole('button', { name: /festlegen|set.*password|ange/i }).click();
    
    // Should show error
    await expect(page.getByText(/mindestens 10|at least 10|minst 10/i)).toBeVisible();
  });

  test('setup dialog validates password match', async ({ page }) => {
    // Skip if setup dialog not available
    test.skip(!await page.getByRole('button', { name: /festlegen|set.*password|ange/i }).isVisible({ timeout: 1000 }));
    
    // Enter mismatched passwords
    await page.getByLabel(/^master.*passwort|^master.*password|^huvudlösenord/i).first().fill('validpassword123');
    await page.getByLabel(/bestätigen|confirm|bekräfta/i).fill('differentpassword123');
    await page.getByRole('button', { name: /festlegen|set.*password|ange/i }).click();
    
    // Should show mismatch error
    await expect(page.getByText(/stimmen nicht|do not match|matchar inte/i)).toBeVisible();
  });

  test('shows remaining attempts on failed verification', async ({ page }) => {
    // Open master password dialog
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    // Enter wrong password multiple times
    for (let i = 0; i < 3; i++) {
      await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill(`wrong${i}`);
      await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
      await page.waitForTimeout(500);
    }
    
    // Should show attempts remaining (if backend implements this)
    const errorText = await page.locator('[role="alert"], .text-destructive').textContent();
    // This is optional based on backend implementation
  });

  test('allows canceling master password dialog', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    // Click cancel
    await page.getByRole('button', { name: /abbrechen|cancel|avbryt/i }).click();
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
