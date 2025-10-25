# i18n Diagnostics Guide

## Overview

This document provides diagnostic steps, tools, and error signatures for troubleshooting the i18n (internationalization) setup. Use this guide to verify the system is working correctly and to debug any issues.

---

## Expected Behavior (Test Matrix)

| Page      | Expected Behavior                                  |
|-----------|---------------------------------------------------|
| Login     | Clicks respond immediately, no invisible blocker  |
| Dashboard | Language loads correctly and remains stable       |
| Editor    | No "blinking" or flickering components            |
| Console   | Max **1×** `languageChanged` event per switch     |

---

## Quick Health Checks

Run these checks in the browser console to verify the i18n system is healthy:

### 1️⃣ Verify Single i18n Instance

```js
// Check that only one i18n instance exists globally
console.log(window.__i18n_instance === i18n); // Should be true
```

**Expected:** `true`  
**If false:** Multiple i18n instances exist, causing language switching loops.

---

### 2️⃣ Check for Click-Blocking Elements

```js
// Find the top element under the mouse cursor
const at = (x, y) => document.elementFromPoint(x, y);
console.log(at(innerWidth/2, innerHeight/2));
```

**Expected:** The actual interactive element (button, input, etc.)  
**If blocked:** A `div`, `Backdrop`, or `Gate` element is blocking clicks.

**Advanced check - List all large fixed overlays:**

```js
[...document.querySelectorAll('*')].filter(e => {
  const s = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  return s.position === 'fixed'
    && r.width > 300 && r.height > 200
    && Number(s.zIndex || 0) > 10
    && s.pointerEvents !== 'none';
}).map(e => ({
  el: e,
  z: getComputedStyle(e).zIndex,
  pe: getComputedStyle(e).pointerEvents
}));
```

**Expected:** Empty array or only intentional modals/dialogs  
**If blocked:** Elements with `pointer-events: auto` are blocking interaction.

---

### 3️⃣ Monitor Language Change Events

```js
// Log every language change event
i18n.on('languageChanged', lng => console.log('changed →', lng));
```

**Expected:** Exactly **1 log** per user-initiated language switch  
**If multiple:** Language switching loop is active.

---

### 4️⃣ Test Language Switching

```js
import { setLocale } from '@/i18n/setLocale';

// First switch - should work
await setLocale('de');
// ✅ Expected: UI changes to German, 1 console log

// Second switch to same language - should do nothing
await setLocale('de');
// ✅ Expected: No change, no console log (guard prevents redundant switch)
```

---

## Architecture Overview

### Single Source of Truth: `localStorage.getItem('lang')`

- **No language detector** - direct initialization prevents auto-detection loops
- **Bundled resources** - no HTTP requests, no 404 errors
- **Singleton instance** - `globalThis.__i18n_instance` prevents duplicates

### Key Components

| Component              | Purpose                                          |
|------------------------|--------------------------------------------------|
| `src/i18n/init.ts`     | Single i18n instance, direct initialization      |
| `src/i18n/setLocale.ts`| Centralized, guarded language switching          |
| `src/components/LanguageGate.tsx` | Prevents rendering until i18n is ready |
| `src/providers/I18nSafeProvider.tsx` | Wraps app in I18nextProvider + Gate |
| `src/hooks/useLocaleHydration.ts` | One-time user language preference loading |

---

## Common Issues & Solutions

### Issue 1: Login Page Buttons Not Responding

**Symptoms:**
- Buttons/inputs appear but don't respond to clicks
- No visual flickering, but UI is "dead"

**Root Cause:**
An invisible element with `pointer-events: auto` is blocking clicks.

**Diagnostic:**
```js
console.log(document.elementFromPoint(innerWidth/2, innerHeight/2));
```

**Solution:**
Ensure `LanguageGate` returns `<div style={{ pointerEvents: 'none' }} />` when not ready.

---

### Issue 2: Editor/Preview Flickering

**Symptoms:**
- UI elements flash/re-render repeatedly
- Language switches back and forth
- Console shows multiple `languageChanged` events

**Root Cause:**
- Hydration hook called multiple times (no guard)
- Direct `changeLanguage()` calls without guards
- Multiple i18n instances (HMR/StrictMode)

**Diagnostic:**
```js
// Check for multiple language change events
i18n.on('languageChanged', lng => console.count('change'));
// Should increment by 1 per intentional switch only
```

**Solution:**
- Add `useRef` guard in `useLocaleHydration`
- Replace all `i18n.changeLanguage()` with `setLocale()`
- Verify single i18n import source

---

### Issue 3: Language Not Persisting

**Symptoms:**
- Language resets on page reload
- User preference not saved

**Diagnostic:**
```js
console.log(localStorage.getItem('lang')); // Should match current language
```

**Solution:**
Ensure `setLocale()` includes `localStorage.setItem('lang', lng)`.

---

## Error Signatures

### Loop Detection

```
Console output:
changed → en
changed → de
changed → en
changed → de
...
```

**Fix:** Check for direct `changeLanguage()` calls, ensure `setLocale()` guards are active.

---

### Click Blocking

```
Console check:
document.elementFromPoint(x, y) → <div></div> (not the button/input)
```

**Fix:** Add `pointer-events: none` to blocker element or remove unnecessary overlays.

---

### Multiple Instances

```
Console check:
window.__i18n_instance === i18n → false
```

**Fix:** Ensure all imports use `@/i18n/init`, no diverging paths.

---

## Development Guidelines

### DO ✅

- Always use `setLocale(lng)` for language switching
- Implement one-time guards (`useRef`) in hydration hooks
- Keep single i18n import source (`@/i18n/init`)
- Return `<div style={{ pointerEvents: 'none' }} />` in loading gates
- Bundle all translation resources directly in code

### DON'T ❌

- Never call `i18n.changeLanguage()` directly
- Don't use language detectors (causes loops)
- Don't load translations via HTTP (causes 404s and delays)
- Don't render `null` in gates that might block clicks
- Don't create multiple i18n instances

---

## CI/CD Checks

### Prevent Direct `changeLanguage` Calls

```bash
# Search for forbidden direct calls (excluding setLocale.ts itself)
grep -R "changeLanguage(" src/ | grep -v "setLocale"
```

**Expected:** No results (all calls should use `setLocale()`)

---

### Verify Single Import Source

```bash
# Ensure all imports use the same path
grep -R "from '@/i18n/init'" src/
```

**Expected:** All imports use `@/i18n/init` (no `../../i18n/init` or other variants)

---

## StrictMode Testing (Development Only)

If flickering persists in development, temporarily disable StrictMode to isolate the issue:

```tsx
// main.tsx (diagnostic only)
const Root = import.meta.env.MODE === 'development'
  ? <App />
  : <React.StrictMode><App /></React.StrictMode>;
```

**Note:** This is diagnostic only. The proper fix is ensuring hooks/effects are idempotent, not removing StrictMode.

---

## Performance Benchmarks

| Metric                          | Expected Value       |
|---------------------------------|----------------------|
| Initial language load time      | < 50ms (synchronous) |
| Language switch time            | < 200ms              |
| `languageChanged` events/switch | Exactly 1            |
| localStorage reads on mount     | Exactly 1            |
| HTTP requests for translations  | 0 (bundled)          |

---

## Support & Documentation

- **Architecture docs:** `docs/i18n-architecture.md`
- **Loop fix details:** `docs/i18n-loop-fix.md`
- **Troubleshooting:** `docs/i18n-troubleshooting.md`
- **General guide:** `docs/i18n-guide.md`

---

## Quick Reference Commands

```bash
# Clear all i18n storage (fresh start)
localStorage.removeItem('lang');
localStorage.removeItem('i18nextLng');
location.reload();

# Test language switch
import { setLocale } from '@/i18n/setLocale';
await setLocale('de');

# Monitor events
i18n.on('languageChanged', lng => console.log('→', lng));

# Find click blockers
document.elementFromPoint(innerWidth/2, innerHeight/2);
```

---

**Last Updated:** 2025-01-25  
**Stable Configuration Version:** 2.0
