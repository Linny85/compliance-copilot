# 🌍 Internationalization (i18n) Guide

## Quick Start

### Adding New Translations

**ALWAYS** edit `src/lib/i18n.ts`, not JSON files:

```typescript
// ✅ CORRECT - Add to src/lib/i18n.ts
export const translations = {
  en: {
    myFeature: {
      title: "My Feature"
    }
  },
  de: {
    myFeature: {
      title: "Mein Feature"
    }
  },
  sv: {
    myFeature: {
      title: "Min funktion"
    }
  }
};
```

### Using Translations

```tsx
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { tx } = useI18n();
  return <h1>{tx('myFeature.title')}</h1>;
}
```

## Verification Before Commit

```bash
# Quick check
node scripts/verify-embedded-i18n.js

# Full validation
npm run build  # Ensures TypeScript compiles
```

## 📚 Documentation

- **Workflow Guide**: `docs/i18n-workflow.md` - Complete usage guide
- **CI Setup**: `docs/i18n-ci-setup.md` - GitHub Actions configuration
- **Architecture**: See `docs/i18n-architecture.md` for design decisions

## 🚨 Important

- **Embedded translations** in `src/lib/i18n.ts` are the **single source of truth**
- JSON files in `public/locales/` are for reference only
- Always update **all three languages** (en, de, sv) together
- Use the PR template for i18n changes: `.github/PULL_REQUEST_TEMPLATE/i18n_sync.md`

## 🐛 Common Issues

### Keys Not Showing

**Symptom:** Raw keys like `myFeature.title` visible in UI

**Fix:** Add key to `src/lib/i18n.ts` in all three languages

### Console Warnings

**Symptom:** `[i18n] Missing key in de: myFeature.title`

**Fix:** Ensure key exists in German block of `src/lib/i18n.ts`

## 🔗 Quick Links

- Translation Context: `src/contexts/I18nContext.tsx`
- i18n Config: `src/i18n/init.ts`
- Embedded Translations: `src/lib/i18n.ts`
- Verification Script: `scripts/verify-embedded-i18n.js`
- CI Workflow: `.github/workflows/i18n-sync.yml`
