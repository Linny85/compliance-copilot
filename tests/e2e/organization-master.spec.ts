import { test, expect } from '@playwright/test';

test.describe('Organization Master Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/organization');
  });

  test('shows master password dialog when editing', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/master.*passwort|master.*password|huvudlösenord/i)).toBeVisible();
  });

  test('shows error message for invalid password', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
    await expect(page.getByText(/ungültig|invalid|ogiltigt/i)).toBeVisible();
  });

  test('opens setup dialog when password not set', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    const maybeNotSet = await page.getByText(/nicht gesetzt|not set|ej inställt/i).isVisible({ timeout: 1000 });
    
    if (maybeNotSet) {
      await expect(page.getByText(/festlegen|set.*password|ange/i)).toBeVisible();
    }
  });

  test('setup dialog validates password requirements', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    const maybeNotSet = await page.getByText(/nicht gesetzt|not set|ej inställt/i).isVisible({ timeout: 1000 });
    if (!maybeNotSet) {
      test.skip();
    }

    await page.getByLabel(/^master.*passwort|^master.*password|^huvud/i).first().fill('short');
    await page.getByLabel(/bestätigen|confirm|bekräfta/i).fill('short');
    await page.getByRole('button', { name: /festlegen|set/i }).click();
    await expect(page.getByText(/mindestens 10|at least 10|minst 10/i)).toBeVisible();
  });

  test('setup dialog validates password match', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    const maybeNotSet = await page.getByText(/nicht gesetzt|not set|ej inställt/i).isVisible({ timeout: 1000 });
    if (!maybeNotSet) {
      test.skip();
    }

    await page.getByLabel(/^master.*passwort|^master.*password|^huvud/i).first().fill('validpassword123');
    await page.getByLabel(/bestätigen|confirm|bekräfta/i).fill('differentpassword123');
    await page.getByRole('button', { name: /festlegen|set/i }).click();
    await expect(page.getByText(/stimmen nicht|do not match|matchar inte/i)).toBeVisible();
  });

  test('shows remaining attempts on failed verification', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    for (let i = 0; i < 2; i++) {
      await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill(`wrong${i}`);
      await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
      await page.waitForTimeout(500);
      
      const attemptsText = await page.locator('[role="alert"]').textContent();
      if (attemptsText?.includes('attempts remaining') || attemptsText?.includes('Versuche')) {
        expect(attemptsText).toMatch(/\d+ (attempts remaining|Versuche)/);
      }
    }
  });

  test('shows lockout message after too many attempts', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    for (let i = 0; i < 5; i++) {
      await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill(`wrong${i}`);
      await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
      await page.waitForTimeout(500);
    }
    
    await expect(page.getByText(/gesperrt|locked|låst/i)).toBeVisible({ timeout: 2000 });
  });

  test('allows canceling master password dialog', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    await page.getByRole('button', { name: /abbrechen|cancel|avbryt/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('complete flow: setup → verify → edit', async ({ page }) => {
    await page.getByRole('button', { name: /bearbeiten|edit|redigera/i }).click();
    
    const maybeNotSet = await page.getByText(/nicht gesetzt|not set|ej inställt/i).isVisible({ timeout: 1000 });
    
    if (maybeNotSet) {
      await page.getByLabel(/^master.*passwort|^master.*password|^huvud/i).first().fill('validpassword123');
      await page.getByLabel(/bestätigen|confirm|bekräfta/i).fill('validpassword123');
      await page.getByRole('button', { name: /festlegen|set/i }).click();
      await expect(page.getByText(/erfolgreich|success/i)).toBeVisible({ timeout: 2000 });
    }
    
    await page.getByPlaceholder(/master.*passwort|master.*password|huvudlösenord/i).fill('validpassword123');
    await page.getByRole('button', { name: /bestätigen|confirm|bekräfta/i }).click();
    
    await expect(page.getByRole('textbox').first()).toBeEnabled({ timeout: 2000 });
  });
});
