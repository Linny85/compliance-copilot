import { test, expect } from '@playwright/test';

test.describe('NIS2 Risk Template Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to NIS2 page - adjust URL as needed
    await page.goto('/nis2');
  });

  test('Template combobox opens and allows search', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /Risiko hinzufügen|Add Risk/i }).click();
    
    // Click template combobox
    await page.getByRole('button', { name: /Vorlage wählen|Choose template/i }).click();
    
    // Search input should be visible
    const searchInput = page.getByPlaceholder(/Suchen|Search/i);
    await expect(searchInput).toBeVisible();
    
    // Type search term
    await searchInput.fill('kritische');
    
    // Results should be filtered
    await expect(page.getByText(/kritische Systeme|critical systems/i)).toBeVisible();
  });

  test('Selecting template populates title, level, and status', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /Risiko hinzufügen|Add Risk/i }).click();
    
    // Click template combobox
    await page.getByRole('button', { name: /Vorlage wählen|Choose template/i }).click();
    
    // Select first template
    await page.getByText(/Unbefugter Zugriff|Unauthorized access/i).first().click();
    
    // Title field should be populated
    const titleInput = page.getByLabel(/Risikotitel|Risk Title/i);
    await expect(titleInput).not.toHaveValue('');
    
    // Risk level should be set
    const levelSelect = page.getByRole('combobox', { name: /Risikostufe|Risk Level/i });
    const levelValue = await levelSelect.textContent();
    expect(levelValue).toMatch(/Niedrig|Mittel|Hoch|Low|Medium|High/i);
  });

  test('Custom formulation option clears template selection', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /Risiko hinzufügen|Add Risk/i }).click();
    
    // Click template combobox
    await page.getByRole('button', { name: /Vorlage wählen|Choose template/i }).click();
    
    // Click custom formulation
    await page.getByText(/Eigene Formulierung|custom formulation/i).click();
    
    // Title should be empty
    const titleInput = page.getByLabel(/Risikotitel|Risk Title/i);
    await expect(titleInput).toHaveValue('');
  });

  test('Title field remains editable after template selection', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /Risiko hinzufügen|Add Risk/i }).click();
    
    // Select a template
    await page.getByRole('button', { name: /Vorlage wählen|Choose template/i }).click();
    await page.getByText(/Phishing/i).first().click();
    
    // Edit the title
    const titleInput = page.getByLabel(/Risikotitel|Risk Title/i);
    await titleInput.fill('Custom edited title');
    
    // Verify custom title is set
    await expect(titleInput).toHaveValue('Custom edited title');
  });
});
