# QA Run Checklist - Quick Reference

Ultra-compact checklist for running QA tests locally.

## 🚀 Quick Start (3 Steps)

### 1. Set Environment Variables

**Bash/Zsh:**
```bash
export QA_BASE_URL="https://your-host.com"
export QA_AUTH_COOKIE="sb:token=...; sb:refresh=..."
```

**PowerShell:**
```powershell
$env:QA_BASE_URL="https://your-host.com"
$env:QA_AUTH_COOKIE="sb:token=...; sb:refresh=..."
```

**How to get auth cookie:**
1. Open DevTools (F12) → Network tab
2. Load your app while authenticated
3. Find any request to your domain
4. Copy entire `Cookie` header value

### 2. Run Tests

```bash
# Both profiles (recommended)
npm run qa:run

# Auth only
npm run qa:auth

# Unauth only
npm run qa:unauth

# Windows
npm run qa:auth:win
npm run qa:unauth:win
```

### 3. Check Outputs

```bash
# List generated files
ls qa/bundles/
ls qa/reports/phase4/
```

**Expected files:**
- `qa/bundles/qa-bundle-auth-YYYYMMDD-HHmmss.json`
- `qa/bundles/qa-bundle-unauth-YYYYMMDD-HHmmss.json`
- `qa/bundles/qa-junit-*.xml`
- `qa/reports/**/[ok|rx|err]-*.json`

## 📊 Reading Console Output

The runner now shows a compact summary:

```
✓ auth/redirects → 200 (245ms)
✓ auth/i18n → 200 (1832ms)
✓ auth/phase3 → 200 (523ms)
✓ auth/phase4 → 200 (189ms)

═══ QA SUMMARY ═══
 ✓ PASS | auth/redirects       [200]
 ✓ PASS | auth/i18n            [200]
 ✓ PASS | auth/phase3          [200]
 ✓ PASS | auth/phase4          [200]
═══════════════════

◎ Bundle gespeichert: qa/bundles/qa-bundle-auth-20250131-120530.json
✔ JUnit export: qa/bundles/qa-junit-auth-20250131-120530.xml
```

## 🎯 Expected Results by Phase

| Phase | Profile | Expected | Codes |
|-------|---------|----------|-------|
| redirects | unauth | Redirect to /auth | 302/303 |
| redirects | auth | Success on protected pages | 200 |
| i18n | both | No missing keys | 200 |
| phase3 | unauth | Auth required | 401 |
| phase3 | auth | Success (may see 403 if role check) | 200/403 |
| phase4 | both | Headers present | 200 |

## 📁 Report Naming Convention

Files are prefixed with status for quick scanning:

- **`ok-*`** → HTTP 2xx (success)
- **`rx-*`** → HTTP 3xx (redirect, often expected)
- **`err-*`** → HTTP 4xx/5xx or exception

Example:
```
qa/reports/phase3/
  ok-auth-phase3-20250131-120530.json    ✓ Good
  rx-unauth-phase3-20250131-120532.json  ✓ Expected redirect
  err-auth-phase3-20250131-120535.json   ✗ Needs investigation
```

## 🔍 What to Share for Analysis

After running, share these files:

1. **Required:**
   - `qa/bundles/qa-bundle-auth-*.json`
   - `qa/bundles/qa-bundle-unauth-*.json`

2. **If Phase 4 has findings:**
   - `qa/reports/phase4/err-*.json` (or `ok-*.json` to see what passed)

3. **Optional (for CI integration):**
   - `qa/bundles/qa-junit-*.xml`

## ⚠️ Common Issues

### "Missing env QA_BASE_URL"
→ Set environment variable (see step 1)

### All auth tests return 401
→ Cookie expired, extract fresh cookie from browser

### Test page 404
→ Ensure `VITE_TEST_MODE=1` in `.env.local`

### Phase 4 headers missing
→ Check if running against local or production:
- Local: Add headers in `vite.config.ts`
- Production: Configure reverse proxy

## 🎯 Success Indicators

**✅ Green (All Good):**
- Auth tests: all 200
- Unauth tests: 302/401/403 (guards working)
- i18n: 0 missing keys
- Phase 4: validation passed

**⚠️ Yellow (Review):**
- Some unexpected 401/403 in auth tests
- Missing translations found
- Some security headers missing

**❌ Red (Critical):**
- Auth getting 401/403 everywhere
- Unauth getting 200 (no guards!)
- RLS cross-tenant writes succeeding
- Invalid webhook signatures accepted

## 🔄 Iteration Cycle

1. Run tests → identify issues
2. Apply fixes (navigation, i18n, RBAC, headers)
3. Re-run: `npm run qa:run`
4. Repeat until green ✅

## 📚 Related Docs

- [Full QA Setup Guide](./qa-setup.md)
- [Complete Checklist](./qa-checklist.md)
- [Phase 4 Headers Guide](./qa-phase4-headers.md)
- [Phase 3 Upgrades](./phase3-upgrades.md)
