# i18n Pre-Commit Validation

This project uses automated i18n validation to ensure translation consistency across all locales.

## What gets checked

- **Structure consistency**: All locale files (de/en/sv) must have identical key structures
- **Missing keys**: Detects keys present in one locale but missing in others
- **Extra keys**: Identifies keys that exist in one locale but not in the reference (de)
- **Alphabetical sorting**: Auto-sorts keys for better diffs

## When validation runs

Validation runs automatically:
- **Pre-commit hook**: Before each git commit via Husky
- **Manual**: Run `npm run i18n:check` anytime

## Files validated

- `public/locales/{de,en,sv}/norrly.json`
- `public/locales/{de,en,sv}/common.json`
- `public/locales/{de,en,sv}/assistant.json`
- `public/locales/{de,en,sv}/labels.json`

## How to fix validation errors

If you see errors like:
```
[i18n] ❌ Mismatch in en/norrly.json
  Missing keys: ['header.newKey', 'intro.description']
```

1. Add the missing keys to the affected locale file
2. Ensure the structure matches the reference (de) locale
3. Run `npm run i18n:check` to verify
4. Commit again

## Bypassing validation

**Not recommended**, but if needed:
```bash
git commit --no-verify
```

## Adding new namespaces

Edit `scripts/check-i18n.js` and add the namespace to the `NAMESPACES` array.
