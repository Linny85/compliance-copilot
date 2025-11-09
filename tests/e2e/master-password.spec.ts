import { test, expect } from '@playwright/test';

// Test master password should be set in ENV: E2E_MASTER_PW
const CORRECT_MASTER_PASSWORD = process.env.E2E_MASTER_PW || 'TestMaster123!';
const WRONG_PASSWORD = 'DefinitelyWrongPassword123';

test.describe('Master Password Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to organization settings page
    await page.goto('/organization');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('shows error message on incorrect password', async ({ page }) => {
    // Open master password dialog (adapt selector based on your implementation)
    const triggerButton = page.locator('button:has-text("Master-Passwort ändern"), button:has-text("Change Master Password")').first();
    if (await triggerButton.isVisible()) {
      await triggerButton.click();
    }

    // Wait for dialog to appear
    const dialog = page.locator('[data-testid="mpw-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Enter wrong password
    const passwordInput = page.locator('[data-testid="mpw-input"]');
    await passwordInput.fill(WRONG_PASSWORD);

    // Submit
    const submitButton = page.locator('[data-testid="mpw-submit"]');
    await submitButton.click();

    // Wait for error message
    const errorMessage = page.locator('[data-testid="mpw-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Check error text contains indication of invalid password
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/falsch|invalid|incorrect/i);

    // Dialog should remain open
    await expect(dialog).toBeVisible();
  });

  test('succeeds with correct password and closes dialog', async ({ page }) => {
    // Open master password dialog
    const triggerButton = page.locator('button:has-text("Master-Passwort ändern"), button:has-text("Change Master Password")').first();
    if (await triggerButton.isVisible()) {
      await triggerButton.click();
    }

    // Wait for dialog
    const dialog = page.locator('[data-testid="mpw-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Enter correct password
    const passwordInput = page.locator('[data-testid="mpw-input"]');
    await passwordInput.fill(CORRECT_MASTER_PASSWORD);

    // Submit
    const submitButton = page.locator('[data-testid="mpw-submit"]');
    await submitButton.click();

    // Dialog should close on success
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Protected fields should now be accessible (adapt based on your UI)
    // Example: sensitive input fields are no longer disabled
    const sensitiveFields = page.locator('input[type="password"][disabled], input[data-protected="true"][disabled]');
    const disabledCount = await sensitiveFields.count();
    
    // After successful master password verification, there should be fewer (or no) disabled fields
    expect(disabledCount).toBeLessThanOrEqual(1);
  });

  test('shows service unavailable error when backend is offline', async ({ page }) => {
    // Abort all requests to simulate offline backend
    await page.route('**/functions/v1/verify-master', route => route.abort());
    await page.route('**/rest/v1/rpc/verify_master_password', route => route.abort());

    // Open dialog
    const triggerButton = page.locator('button:has-text("Master-Passwort ändern"), button:has-text("Change Master Password")').first();
    if (await triggerButton.isVisible()) {
      await triggerButton.click();
    }

    const dialog = page.locator('[data-testid="mpw-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Try to submit
    const passwordInput = page.locator('[data-testid="mpw-input"]');
    await passwordInput.fill(CORRECT_MASTER_PASSWORD);

    const submitButton = page.locator('[data-testid="mpw-submit"]');
    await submitButton.click();

    // Should show service unavailable error
    const errorMessage = page.locator('[data-testid="mpw-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/dienst|service|erreichbar|unavailable|offline/i);
  });

  test('shows rate limit error after too many attempts', async ({ page }) => {
    // Open dialog
    const triggerButton = page.locator('button:has-text("Master-Passwort ändern"), button:has-text("Change Master Password")').first();
    if (await triggerButton.isVisible()) {
      await triggerButton.click();
    }

    const dialog = page.locator('[data-testid="mpw-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const passwordInput = page.locator('[data-testid="mpw-input"]');
    const submitButton = page.locator('[data-testid="mpw-submit"]');

    // Make 6 rapid incorrect attempts to trigger rate limit
    for (let i = 0; i < 6; i++) {
      await passwordInput.fill(`WrongPassword${i}`);
      await submitButton.click();
      
      // Small delay between attempts
      await page.waitForTimeout(500);
    }

    // Last attempt should show rate limit error
    const errorMessage = page.locator('[data-testid="mpw-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/viele|versuche|rate|limit|später|later/i);
  });
});
