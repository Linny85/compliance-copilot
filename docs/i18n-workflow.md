# i18n Workflow & Maintenance Guide

## Architecture Overview

This project uses **embedded translations** in `src/lib/i18n.ts` as the single source of truth. The JSON files in `public/locales/` are for reference only and are NOT actively loaded by the application.

### Why Embedded Translations?

1. **Performance**: No network requests to fetch translations
2. **Type Safety**: TypeScript can validate translation keys at compile time
3. **Bundle Optimization**: Unused translations can be tree-shaken
4. **Immediate Availability**: No async loading delays

## Adding New Translations

### ✅ CORRECT Way

1. Open `src/lib/i18n.ts`
2. Find the appropriate namespace (e.g., `checks`, `aiSystems`, `common`)
3. Add your keys to **ALL THREE LANGUAGES** (en, de, sv):

```typescript
// In src/lib/i18n.ts

export const translations = {
  en: {
    myFeature: {
      title: "My Feature Title",
      description: "Feature description",
      actions: {
        save: "Save",
        cancel: "Cancel"
      }
    }
  },
  de: {
    myFeature: {
      title: "Mein Feature Titel",
      description: "Feature Beschreibung",
      actions: {
        save: "Speichern",
        cancel: "Abbrechen"
      }
    }
  },
  sv: {
    myFeature: {
      title: "Min funktionens titel",
      description: "Funktionsbeskrivning",
      actions: {
        save: "Spara",
        cancel: "Avbryt"
      }
    }
  }
};
```

### ❌ INCORRECT Way

Do NOT add translations to JSON files only:

```json
// ❌ DON'T DO THIS
// public/locales/en/myFeature.json
{
  "title": "My Feature"
}
```

**These files are not loaded by the application!**

## Using Translations in Components

```typescript
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { tx } = useI18n();

  return (
    <div>
      <h1>{tx('myFeature.title')}</h1>
      <p>{tx('myFeature.description')}</p>
      <button>{tx('myFeature.actions.save')}</button>
    </div>
  );
}
```

## Verification Before Commit

### 1. Run Local Checks

```bash
# Check namespace consistency
npm run check-locales -- --namespaces checks aiSystems common training --ref en

# Verify embedded structure
node scripts/verify-embedded-i18n.js

# Build to ensure no TypeScript errors
npm run build
```

### 2. Visual Testing

- Navigate to pages that use new translations
- Switch languages (DE → EN → SV)
- Verify no `[key]` placeholders visible
- Check browser console for missing key warnings

## CI/CD Integration

Our GitHub Actions workflow automatically verifies:

1. ✅ All required namespaces exist in `src/lib/i18n.ts`
2. ✅ Critical keys are present across all languages
3. ✅ TypeScript compilation succeeds
4. ✅ No syntax errors in translation objects

**Workflow File:** `.github/workflows/i18n-sync.yml`

## Common Issues & Solutions

### Issue: Keys Not Displaying

**Symptom:** Raw keys like `checks.form.title` show instead of translations

**Cause:** Key missing from `src/lib/i18n.ts`

**Fix:**
1. Add key to all three languages in `src/lib/i18n.ts`
2. Restart dev server
3. Verify in browser

### Issue: Missing Key Warnings in Console

**Symptom:** Console shows `[i18n] Missing key in de: myFeature.title`

**Cause:** Key exists in English but not in German/Swedish

**Fix:**
1. Ensure key exists in all three language blocks
2. Check for typos in key paths
3. Verify nested object structure matches

### Issue: Inconsistent Quotes

**Symptom:** German translations use `„text"` instead of `"text"`

**Cause:** Copy-paste from external sources

**Fix:**
1. Replace all `„"` with standard `""`
2. Use only ASCII quotes in source code
3. Run search/replace: `[„"]` → `"`

## Translation Key Naming Conventions

### Good Examples

```typescript
{
  form: {
    title: "Form Title",
    fields: {
      name: "Name",
      email: "Email"
    },
    actions: {
      save: "Save",
      cancel: "Cancel"
    }
  }
}
```

### Bad Examples

```typescript
{
  // ❌ Too flat
  formTitle: "Form Title",
  formFieldName: "Name",
  
  // ❌ Redundant prefixes
  form_form_title: "Form Title",
  
  // ❌ Unclear structure
  stuff: {
    thing1: "Title",
    thing2: "Name"
  }
}
```

### Best Practices

1. **Group by feature/page**: `checks`, `aiSystems`, `dashboard`
2. **Use semantic nesting**: `form.fields.name` not `formFieldsName`
3. **Consistent naming**: `actions.save`, `actions.cancel`, `actions.delete`
4. **Singular namespace names**: `control` not `controls` (unless plural makes semantic sense)
5. **Avoid deep nesting**: Max 4 levels deep

## PR Template

When adding new translations, use the PR template:

**File:** `.github/PULL_REQUEST_TEMPLATE/i18n_sync.md`

This ensures:
- All languages are updated
- QA artifacts are attached
- CI checks are mentioned
- Acceptance criteria are clear

## Maintenance Checklist

Before any release:

- [ ] Run `node scripts/verify-embedded-i18n.js`
- [ ] Test language switching in preview
- [ ] Check console for missing key warnings
- [ ] Verify all new features have translations
- [ ] Ensure PR template was used for i18n changes
- [ ] CI workflow passed successfully

## Future Improvements

### Potential Enhancements

1. **Auto-sync Script**: Generate `src/lib/i18n.ts` from JSON files
2. **Translation Coverage Report**: Show % complete per language
3. **Missing Key Detector**: Runtime monitoring in dev mode
4. **Type-Safe Keys**: Use TypeScript to validate translation keys at compile time

### Migration Options

If you want to use JSON files instead of embedded:

1. Update `src/i18n/init.ts` to load from HTTP backend
2. Remove embedded translations from `src/lib/i18n.ts`
3. Update CI to validate JSON files
4. Document new workflow

**Note:** Current embedded approach is optimized for this project's needs.

## References

- **i18next Documentation**: https://www.i18next.com/
- **React i18next**: https://react.i18next.com/
- **Project i18n Config**: `src/i18n/init.ts`
- **Context Provider**: `src/contexts/I18nContext.tsx`
