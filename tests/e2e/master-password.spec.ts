import { test, expect } from '@playwright/test';

test.describe('Master Password Gate', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app - assumes /dashboard requires master password
    await page.goto('/dashboard');
  });

  test('shows master password dialog when accessing protected route', async ({ page }) => {
    // Check if master password dialog is visible
    const dialog = page.getByRole('dialog').filter({ hasText: /Master.*Password|Master.*Passwort/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('rejects wrong password with accessible error', async ({ page }) => {
    const dialog = page.getByRole('dialog').filter({ hasText: /Master.*Password|Master.*Passwort/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Fill wrong password
    const passwordInput = page.getByLabel(/Passwort|Password/i);
    await passwordInput.fill('wrong-password-123');
    
    // Submit
    const submitBtn = page.getByRole('button', { name: /Bestätigen|Confirm|Unlock|Freischalten/i });
    await submitBtn.click();
    
    // Expect error message
    await expect(page.getByText(/falsch|invalid|incorrect|wrong/i)).toBeVisible({ timeout: 3000 });
    
    // Dialog should still be visible
    await expect(dialog).toBeVisible();
  });

  test('accepts correct password and grants access', async ({ page }) => {
    // Skip if no master password is set in env
    if (!process.env.E2E_MASTER_PASSWORD) {
      test.skip();
      return;
    }

    const dialog = page.getByRole('dialog').filter({ hasText: /Master.*Password|Master.*Passwort/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Fill correct password
    const passwordInput = page.getByLabel(/Passwort|Password/i);
    await passwordInput.fill(process.env.E2E_MASTER_PASSWORD);
    
    // Submit
    const submitBtn = page.getByRole('button', { name: /Bestätigen|Confirm|Unlock|Freischalten/i });
    await submitBtn.click();
    
    // Dialog should disappear
    await expect(dialog).toBeHidden({ timeout: 5000 });
    
    // Should see dashboard content
    await expect(page.getByText(/Dashboard|Willkommen|Welcome/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows attempt counter on multiple failures', async ({ page }) => {
    const dialog = page.getByRole('dialog').filter({ hasText: /Master.*Password|Master.*Passwort/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Try wrong password multiple times
    const passwordInput = page.getByLabel(/Passwort|Password/i);
    const submitBtn = page.getByRole('button', { name: /Bestätigen|Confirm|Unlock|Freischalten/i });
    
    for (let i = 0; i < 2; i++) {
      await passwordInput.fill(`wrong-attempt-${i}`);
      await submitBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Should show attempts remaining or locked message
    const hasAttemptInfo = await page.getByText(/Versuch|attempt|remaining|verbleib/i).isVisible().catch(() => false);
    const hasLockedMsg = await page.getByText(/gesperrt|locked|blocked/i).isVisible().catch(() => false);
    
    expect(hasAttemptInfo || hasLockedMsg).toBeTruthy();
  });

  test('persists session across page reloads', async ({ page, context }) => {
    // Skip if no master password is set
    if (!process.env.E2E_MASTER_PASSWORD) {
      test.skip();
      return;
    }

    const dialog = page.getByRole('dialog').filter({ hasText: /Master.*Password|Master.*Passwort/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Unlock
    await page.getByLabel(/Passwort|Password/i).fill(process.env.E2E_MASTER_PASSWORD);
    await page.getByRole('button', { name: /Bestätigen|Confirm|Unlock|Freischalten/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    
    // Reload page
    await page.reload();
    
    // Should NOT show master password dialog again (session persisted)
    await expect(page.getByText(/Dashboard|Willkommen|Welcome/i)).toBeVisible({ timeout: 5000 });
    const dialogVisible = await dialog.isVisible().catch(() => false);
    expect(dialogVisible).toBe(false);
  });
});
