import { test, expect } from '@playwright/test';

test('ErrorBoundary rendert Fallback bei Fehler', async ({ page }) => {
  await page.goto('/debug/throw');
  // Erwarte typischen Fallback-Text/Element aus deiner Boundary:
  // Passe die Selektoren an deinen Fallback an.
  await expect(
    page.getByText(/Etwas ist schiefgelaufen|Oops|Try again|Neu laden/i)
  ).toBeVisible();
});
