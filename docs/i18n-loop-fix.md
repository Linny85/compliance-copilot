# i18n Language Switching Loop - Fix Documentation

## Problem

The app was experiencing flickering due to an i18n language switching loop caused by:
1. Multiple detection sources (navigator, localStorage, htmlTag) conflicting
2. Missing namespace JSON files causing 404s and reload loops
3. No guards against redundant language changes
4. UI rendering before i18n initialization

## Solution

### 1. No Language Detector - Direct Init

**File: `src/i18n/init.ts`**
- **Removed** `i18next-browser-languagedetector` entirely
- Read `localStorage.getItem('lang')` once at startup
- Initialize i18n with fixed `lng` parameter
- No detection order, no conflicting sources
- `partialBundledLanguages: true` prevents loading loops

### 2. Guards Against Redundant Changes

**File: `src/i18n/setLocale.ts`**
```typescript
export async function setLocale(lng: Locale) {
  const current = i18n.resolvedLanguage || i18n.language;
  
  // Guard 1: Already on this language
  if (current === lng) return;
  
  // Guard 2: Invalid language
  if (!supportedLocales.includes(lng)) return;
  
  // Guard 3: Switch in progress
  if (switching) return;
  
  // Guard 4: Too rapid (throttle 400ms)
  if (Date.now() - lastSwitch < 400) return;
  
  switching = true;
  try {
    await i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
    lastSwitch = Date.now();
  } finally {
    switching = false;
  }
}
```

**CRITICAL:** All code must use `setLocale()` instead of calling `i18n.changeLanguage()` directly!

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

- ✅ **No LanguageDetector** - direct init with `lng` parameter
- ✅ Single read from localStorage at startup
- ✅ `supportedLngs` and `fallbackLng` set
- ✅ All namespaces exist (bundled as empty objects)
- ✅ **Centralized `setLocale()` with 4 guards**
- ✅ `useSuspense: false` + `initImmediate: false`
- ✅ `partialBundledLanguages: true`
- ✅ LanguageGate prevents premature rendering
- ✅ Migration from legacy `i18nextLng` key

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

1. `src/i18n/init.ts` - **Removed LanguageDetector**, direct init, bundled resources
2. `src/i18n/setLocale.ts` - **NEW** - Centralized locale switching with 4-layer guards
3. `src/components/LanguageSwitcher.tsx` - Uses `setLocale()` instead of direct `changeLanguage()`
4. `src/hooks/useLocaleHydration.ts` - Uses `setLocale()` for profile hydration
5. `src/components/LanguageGate.tsx` - Prevents premature rendering
6. `src/providers/I18nSafeProvider.tsx` - Wraps children in LanguageGate

## Migration Notes

If you need to add real translations later:

1. **Keep bundled resources** for stability
2. **Add translations gradually** per namespace
3. **OR** switch back to HTTP backend, but ensure:
   - All JSON files exist (even if empty)
   - Proper error handling for missing files
   - Keep single source detection
