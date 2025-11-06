import { test, expect } from '../fixtures';
import { AxeBuilder } from '@axe-core/playwright';

const commonAxeOptions = {
  // Disable noisy rules you'll fix later or that clash with brand:
  // rules: [{ id: 'color-contrast', enabled: false }],
};

test.describe('A11y: key screens', () => {
  test('dashboard has no critical violations', async ({ page, stubAuth, setLocale }) => {
    await stubAuth({ admin: true });
    await setLocale('de');
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules([])               // add rule ids to mute if needed
      .analyze();

    const critical = results.violations.filter(v =>
      ['critical','serious'].includes(v.impact || '')
    );

    if (critical.length) {
      console.log(JSON.stringify(critical, null, 2));
    }
    expect(critical, 'Critical/serious a11y violations').toHaveLength(0);
  });

  test('auth page basic a11y', async ({ page, setLocale }) => {
    await setLocale('de');
    await page.goto('/auth', { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const critical = results.violations.filter(v =>
      ['critical','serious'].includes(v.impact || '')
    );
    
    if (critical.length) {
      console.log(JSON.stringify(critical, null, 2));
    }
    expect(critical, 'Critical/serious a11y violations').toHaveLength(0);
  });
});
