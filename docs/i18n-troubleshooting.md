# i18n Troubleshooting Guide

## Issue 1: Login Page - Clicks Not Working

### Symptoms
- Buttons and input fields appear but don't respond to clicks
- No visual flickering, but UI is "dead"

### Root Cause
An invisible full-screen element (Loader/Backdrop/RouteGate) is blocking clicks:
- `position: fixed`
- High `z-index`
- `pointer-events: auto` (default)
- Large dimensions covering the viewport

### Diagnostic Steps (Browser Console)

**A. Find the top blocker under the mouse cursor:**

```js
const at = (x,y) => document.elementFromPoint(x,y);
console.log(at(innerWidth/2, innerHeight/2));
```

**B. List all large fixed overlays:**

```js
[...document.querySelectorAll('*')].filter(e=>{
  const s = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  return s.position==='fixed'
    && r.width>300 && r.height>200
    && Number(s.zIndex||0) > 10
    && s.pointerEvents !== 'none';
}).map(e=>({el:e, z:getComputedStyle(e).zIndex, pe:getComputedStyle(e).pointerEvents}));
```

### Solutions Applied

**a) LanguageGate with pointer-events guard:**
- When i18n is not ready, return `<div style={{ pointerEvents: 'none' }} />` instead of `null`
- This prevents the gate from blocking clicks during initialization

**b) Provider correctly wired:**
- Ensure `I18nSafeProvider` wraps children in both `I18nextProvider` and `LanguageGate`
- Never render children outside the provider chain

**c) Failsafe CSS (optional, if needed):**

```css
[data-overlay], .modal-backdrop, .route-loading, .app-backdrop {
  pointer-events: none !important;
}
```

---

## Issue 2: Editor/Preview Page - Flickering

### Symptoms
- UI elements flash/re-render repeatedly
- Language switches back and forth
- Console shows multiple "languageChanged" events

### Possible Causes

1. **Second i18n instance** in edit/preview frame
   - HMR (Hot Module Replacement) creates duplicate instances
   - Storybook/preview environments load the file multiple times

2. **Hydration hook called multiple times**
   - Auth state changes trigger re-runs
   - No guard against repeated execution
   - StrictMode in development doubles effects

3. **Direct `changeLanguage()` calls without guards**
   - Components call `i18n.changeLanguage()` directly
   - No protection against redundant switches

### Solutions Applied

**2.1) One-time guard in hydration hook:**
- Added `useRef` to track execution: `didRun.current`
- Return early if already executed
- Prevents repeated locale switches on auth state changes

**2.2) Singleton i18n instance:**
- Global instance stored in `globalThis.__i18n_instance`
- All imports must use same path: `@/i18n/init`
- No duplicate initialization possible

**2.3) Centralized `setLocale()` with guards:**
- Never call `i18n.changeLanguage()` directly
- Always use `setLocale()` which includes:
  - Same language check
  - Concurrent switch prevention
  - Throttling (400ms)
  - Valid language validation

---

## Quick Verification Checklist

### For Login Page Issues:

1. **Console - Check for blockers:**
   ```js
   console.log(document.elementFromPoint(innerWidth/2, innerHeight/2));
   ```
   → If a fixed/z-indexed blocker is found, apply `pointer-events: none`

2. **Patch Gate/Provider** as shown above

### For Flickering Issues:

1. **Make hydration hook run once** (ref guard implemented)

2. **Search and replace** direct `changeLanguage` calls:
   ```bash
   grep -R "changeLanguage(" -n src | grep -v "setLocale"
   ```
   → Replace all with `setLocale()`

3. **Single i18n import source:**
   ```bash
   grep -R "from '@/i18n/init'" -n src
   ```
   → Ensure no diverging paths (e.g., `../../i18n/init`)

4. **Test language switch:**
   ```js
   import { setLocale } from '@/i18n/setLocale';
   await setLocale('de');   // Should switch once
   await setLocale('de');   // Should do nothing (guard prevents)
   ```

5. **Monitor events:**
   ```js
   i18n.on('languageChanged', (lng) => console.log('changed→', lng));
   ```
   → Expect exactly ONE log per actual switch

---

## StrictMode Testing (Development Only)

If flickering persists in editor/preview, temporarily disable StrictMode:

```tsx
// main.tsx (only for editor host testing)
const Root = import.meta.env.MODE === 'development'
  ? <App />
  : <React.StrictMode><App /></React.StrictMode>;
```

**Note:** This is diagnostic only. The proper fix is ensuring hooks/effects are idempotent, not removing StrictMode.

---

## Expected Behavior After Fix

✅ **Login page:**
- Buttons and inputs respond immediately
- No invisible blockers
- Smooth initial render

✅ **All pages:**
- Zero visible flickering
- Language switches happen once per user action
- Console shows single "languageChanged" event per switch
- No 404 errors for locale files
- No redundant re-renders

✅ **Performance:**
- `localStorage.getItem('lang')` read once at startup
- i18n initialized synchronously (no async flicker)
- Guard prevents concurrent/rapid switches
