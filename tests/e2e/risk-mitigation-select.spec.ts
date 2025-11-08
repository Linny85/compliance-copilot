import { test, expect } from '@playwright/test';

test.describe('Risk dialog – mitigation templates', () => {
  test('Mehrfachvorlagen füllen den Maßnahmenplan deterministisch', async ({ page }) => {
    await page.goto('/nis2');
    
    // Open risk dialog
    const addButton = page.getByRole('button', { name: /risiko hinzufügen|add risk/i });
    await addButton.click();

    // Wait for dialog to be visible
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Open mitigation template combobox
    const templateButton = page.getByRole('button', { name: /maßnahmen auswählen|choose mitigations/i });
    await templateButton.click();

    // Select first template (Datenverlust)
    const dataLossOption = page.getByText(/Datenverlust|Data Loss/i).first();
    await dataLossOption.click();
    
    // Open combobox again for second selection
    await templateButton.click();
    
    // Select second template (Phishing)
    const phishingOption = page.getByText(/Phishing/i).first();
    await phishingOption.click();

    // Check mitigation plan textarea
    const plan = page.getByRole('textbox', { name: /maßnahmenplan|mitigation plan/i });
    const text = await plan.inputValue();

    // Verify both templates are present
    expect(text).toMatch(/### .*Datenverlust|Data Loss/i);
    expect(text).toMatch(/Backup/i);
    expect(text).toMatch(/### .*Phishing/i);
    expect(text).toMatch(/MFA/i);

    // Verify no duplicates when selecting same template again
    await templateButton.click();
    await dataLossOption.click();
    
    const text2 = await plan.inputValue();
    const dataLossCount = (text2.match(/### .*(Datenverlust|Data Loss)/gi) || []).length;
    expect(dataLossCount).toBe(1);

    // Save button should be enabled
    const saveButton = page.getByRole('button', { name: /risiko erstellen|create risk|speichern|save/i });
    await expect(saveButton).toBeEnabled();
  });

  test('Badge removal entfernt Vorlage aus Plan', async ({ page }) => {
    await page.goto('/nis2');
    
    const addButton = page.getByRole('button', { name: /risiko hinzufügen|add risk/i });
    await addButton.click();

    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Select template
    const templateButton = page.getByRole('button', { name: /maßnahmen auswählen|choose mitigations/i });
    await templateButton.click();
    
    const dataLossOption = page.getByText(/Datenverlust|Data Loss/i).first();
    await dataLossOption.click();

    // Verify template is in plan
    const plan = page.getByRole('textbox', { name: /maßnahmenplan|mitigation plan/i });
    let text = await plan.inputValue();
    expect(text).toMatch(/Datenverlust|Data Loss/i);

    // Remove template by clicking X on badge
    const removeBadge = page.getByRole('button', { name: /entfernen|remove/i }).first();
    await removeBadge.click();

    // Verify template is removed from plan
    text = await plan.inputValue();
    expect(text).not.toMatch(/### .*(Datenverlust|Data Loss)/i);
  });
});
