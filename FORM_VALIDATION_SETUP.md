# Form Validation Setup Guide

## Required npm Scripts

Since `package.json` is read-only in this environment, you'll need to add these scripts manually:

```json
{
  "scripts": {
    "lint:forms": "eslint \"src/**/*.{ts,tsx,js,jsx}\" --max-warnings=0"
  }
}
```

Or if you want a separate forms-only check:

```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.{ts,tsx,js,jsx}\"",
    "lint:forms": "eslint \"src/**/*.{ts,tsx,js,jsx}\" --rule 'norrland/input-has-name-or-id: error' --rule 'norrland/input-has-autocomplete: warn'"
  }
}
```

## Setup Checklist

- [x] ESLint plugin created (`tools/eslint-plugin-norrland/index.js`)
- [x] Codemod created (`codemods/add-form-attrs.js`)
- [x] Runtime audit utility (`src/lib/auditForms.ts`)
- [x] Safe Input component (`src/components/Form/Input.tsx`)
- [x] GitHub Actions workflow (`.github/workflows/lint-forms.yml`)
- [x] ESLint config updated (`eslint.config.js`)
- [x] Dependencies installed (`eslint-plugin-jsx-a11y`, `jscodeshift`)
- [ ] **npm scripts added to package.json** (manual step required)
- [ ] Optional: Husky pre-commit hook

## First Run

After adding the npm script:

```bash
# 1. Check current state
npm run lint:forms

# 2. See what the codemod would change (dry-run)
npx jscodeshift -d -p -t codemods/add-form-attrs.js "src/**/*.{tsx,jsx}"

# 3. Apply automated fixes
npx jscodeshift -t codemods/add-form-attrs.js "src/**/*.{tsx,jsx}"

# 4. Fix remaining manual issues
npm run lint:forms

# 5. Commit
git add -A
git commit -m "chore(forms): add accessibility attributes"
```

## Browser Testing

Open your app and in the console:

```javascript
auditForms()
```

This will show any remaining issues in the rendered DOM.

## Next Steps

1. **Add npm scripts** to `package.json` (see above)
2. **Run the codemod** to auto-fix existing inputs
3. **Use the safe Input component** for new forms
4. **Enable pre-commit hooks** (optional but recommended)

See `docs/form-validation.md` for complete documentation.
