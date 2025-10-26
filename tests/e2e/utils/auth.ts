import { Page, expect } from '@playwright/test';

export async function login(page: Page) {
  const email = process.env.TEST_EMAIL!;
  const password = process.env.TEST_PASSWORD!;
  if (!email || !password) {
    console.warn('[E2E] TEST_EMAIL/TEST_PASSWORD nicht gesetzt – Login wird übersprungen.');
    return;
  }
  await page.goto('/');
  await page.getByLabel(/E-Mail/i).fill(email);
  await page.getByLabel(/Passwort/i).fill(password);
  await page.getByRole('button', { name: /anmelden|login/i }).click();
  await expect(page.getByText(/Dashboard|Übersicht|Audit Tasks/i)).toBeVisible({ timeout: 20_000 });
}
