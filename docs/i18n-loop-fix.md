# i18n Language Switching Loop - Fix Documentation

## Problem

The app was experiencing flickering due to an i18n language switching loop caused by:
1. Multiple detection sources (navigator, localStorage, htmlTag) conflicting
2. Missing namespace JSON files causing 404s and reload loops
3. No guards against redundant language changes
4. UI rendering before i18n initialization

## Solution

### 1. Single Source of Truth (localStorage only)

**File: `src/i18n/init.ts`**
- Detection order: **only** `localStorage`
- Key: `lang` (consistent across app)
- No navigator, htmlTag, or other detectors
- `partialBundledLanguages: true` prevents loading loops

### 2. Guards Against Redundant Changes

**File: `src/components/LanguageSwitcher.tsx`**
```typescript
const setLocale = async (lng: string) => {
  // Guard: Only change if different (prevents loop)
  const current = i18n.resolvedLanguage || i18n.language;
  if (current === lng) return;
  
  await i18n.changeLanguage(lng);
  localStorage.setItem('lang', lng);
  // ...
};
```

### 3. Rendering Gate

**File: `src/components/LanguageGate.tsx`**
- Prevents UI render until i18n is `ready`
- Stops flickering during initialization
- Used in `I18nSafeProvider`

### 4. Bundled Resources

**File: `src/i18n/init.ts`**
- All namespaces bundled directly in code
- No HTTP backend requests
- No 404 errors for missing files
- Empty objects `{}` for each namespace/language combination

## Checklist

- ✅ Only one detection source (localStorage)
- ✅ `supportedLngs` and `fallbackLng` set
- ✅ All namespaces exist (bundled as empty objects)
- ✅ Guard before every `changeLanguage`
- ✅ `useSuspense: false` + `initImmediate: false`
- ✅ `partialBundledLanguages: true`
- ✅ LanguageGate prevents premature rendering

## Testing

```bash
# 1. Clear state
localStorage.removeItem('lang');
localStorage.removeItem('i18nextLng');
location.reload();

# 2. Check console for:
# - No 404 errors for /locales/**
# - No repeated language change events
# - Single initialization

# 3. Switch language
# - Should happen instantly
# - No page reload
# - No flickering
```

## Key Files Changed

1. `src/i18n/init.ts` - Single source detection, bundled resources
2. `src/components/LanguageSwitcher.tsx` - Guard against redundant changes
3. `src/components/LanguageGate.tsx` - NEW - Prevents premature rendering
4. `src/providers/I18nSafeProvider.tsx` - Wraps children in LanguageGate

## Migration Notes

If you need to add real translations later:

1. **Keep bundled resources** for stability
2. **Add translations gradually** per namespace
3. **OR** switch back to HTTP backend, but ensure:
   - All JSON files exist (even if empty)
   - Proper error handling for missing files
   - Keep single source detection
