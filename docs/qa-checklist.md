# QA Runner - Final Checklist

Complete pre-flight checklist before running QA automation.

## ✅ Prerequisites Checklist

### 1. Scripts & Dependencies

- [ ] `package.json` scripts added:
  ```json
  "qa:run": "node ./scripts/run-qa.mjs",
  "qa:auth": "QA_RUN=auth node ./scripts/run-qa.mjs",
  "qa:unauth": "QA_RUN=unauth node ./scripts/run-qa.mjs",
  "qa:auth:win": "cross-env QA_RUN=auth node ./scripts/run-qa.mjs",
  "qa:unauth:win": "cross-env QA_RUN=unauth node ./scripts/run-qa.mjs"
  ```
- [ ] `cross-env` installed: `npm install --save-dev cross-env`

### 2. Secrets Configuration

**Local (bash/zsh):**
```bash
export QA_BASE_URL="https://your-host.com"
export QA_AUTH_COOKIE="sb:token=...; sb:refresh=..."
```

**PowerShell:**
```powershell
$env:QA_BASE_URL="https://your-host.com"
$env:QA_AUTH_COOKIE="sb:token=...; sb:refresh=..."
```

**GitHub Actions:**
- [ ] `QA_BASE_URL` secret set in repo settings
- [ ] `QA_AUTH_COOKIE` secret set in repo settings

### 3. Configuration Files

- [ ] `qa/tasks/part2.tasks.json` exists
- [ ] `qa/tasks/phase4.headers.json` exists
- [ ] `qa/reports/.keep` exists
- [ ] `qa/bundles/.keep` exists

### 4. Test Pages Active

- [ ] `/admin/test-mode/redirects` accessible
- [ ] `/admin/test-mode/i18n` accessible
- [ ] `/admin/test-mode/phase3` accessible
- [ ] `/admin/test-mode/phase4` accessible

### 5. Security Features

- [ ] Token redaction active in `scripts/run-qa.mjs`
- [ ] `.gitignore` excludes `qa/reports/` and `qa/bundles/`
- [ ] Header snapshot includes validation in Phase 4

## 🎯 Expected Results Matrix

| Phase | Profile | Expected Result | Typical Codes |
|-------|---------|-----------------|---------------|
| **1 - Redirects/Guards** | unauth | Redirect to `/auth` | 302/303 |
| **1 - Redirects/Guards** | auth | 200 on protected pages | 200 |
| **2 - i18n** | auth/unauth | JSON with 0 missing keys | 200 |
| **3 - Edge Fns/RBAC/RLS** | unauth | 401 for protected functions | 401 |
| **3 - Edge Fns/RBAC/RLS** | auth (no role) | 403 if role missing | 403 |
| **3 - Edge Fns/RBAC/RLS** | auth (with role) | 200, selective RLS | 200 |
| **4 - Security Headers** | auth/unauth | Snapshot with CSP/COOP/COEP/PP/XCTO/Referrer | 200 (HEAD) |

## ▶️ Execution Steps

### Local Testing

1. Set environment variables (see above)
2. Run tests:
   ```bash
   # Both profiles
   npm run qa:run
   
   # Auth only
   npm run qa:auth
   
   # Unauth only
   npm run qa:unauth
   ```

3. Check outputs:
   - Individual reports: `qa/reports/*/`
   - Bundles: `qa/bundles/qa-bundle-*.json`
   - JUnit reports: `qa/bundles/qa-junit-*.xml`

### CI/CD Testing

1. Push to GitHub
2. Navigate to Actions tab
3. Select "QA Runner (Part 2)" workflow
4. Click "Run workflow"
5. Select profiles: `auth,unauth` or individual
6. Download artifacts after completion

## 📊 Report Naming Convention

Reports use status-prefix naming for quick scanning:

- **`ok-*`** - HTTP 2xx (success)
- **`rx-*`** - HTTP 3xx (redirects, often expected)
- **`err-*`** - HTTP 4xx/5xx or exceptions

Example:
```
qa/reports/phase3/
  ok-auth-phase3-20250131-120530.json
  rx-unauth-phase3-20250131-120532.json
  err-auth-phase3-20250131-120535.json
```

## 🔍 Validation Steps

### 1. Token Redaction
Open any bundle JSON and verify:
- No `sb:token=` values visible
- No `sb:refresh=` values visible
- Authorization headers show `[REDACTED]`

### 2. Header Snapshot (Phase 4)
Check `qa/bundles/qa-bundle-auth-*.json` under `phase4` → `body` → `heads`:
```json
{
  "snapshot": {
    "status": 200,
    "headers": { "content-security-policy": "...", ... },
    "timestamp": "..."
  },
  "validation": {
    "passed": true,
    "findings": [],
    "score": 100
  }
}
```

### 3. JUnit Report
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="QA Runner" tests="8">
  <testcase name="auth/redirects" time="0.245"/>
  <testcase name="auth/phase3" time="1.832"/>
  ...
</testsuite>
```

## 🐛 Common Issues

### Missing Cookie Error
```
Error: Missing env QA_BASE_URL
```
**Fix:** Set `QA_BASE_URL` environment variable

### Invalid Cookie
```
Status: 401 for all auth tests
```
**Fix:** 
1. Extract fresh cookie from browser DevTools → Network tab
2. Copy entire `Cookie` header value
3. Update `QA_AUTH_COOKIE` environment variable

### Cross-Origin Headers Missing
```
Phase 4 findings show missing headers
```
**Fix:** 
1. Check if running against local dev or production
2. Local: Add headers in `vite.config.ts`
3. Production: Configure reverse proxy (Nginx, Cloudflare, etc.)

### Test Page 404
```
Status: 404 for /admin/test-mode/phase3
```
**Fix:** Ensure `VITE_TEST_MODE=1` is set in `.env.local`

## 📤 Sharing Results

After successful run, share these files for analysis:

1. **Bundle JSONs** (required):
   - `qa/bundles/qa-bundle-auth-YYYYMMDD-HHmmss.json`
   - `qa/bundles/qa-bundle-unauth-YYYYMMDD-HHmmss.json`

2. **Phase 4 report** (if header findings exist):
   - `qa/reports/phase4/[ok|rx|err]-auth-phase4-*.json`

3. **JUnit reports** (optional, for CI integration):
   - `qa/bundles/qa-junit-auth-*.xml`
   - `qa/bundles/qa-junit-unauth-*.xml`

## 🎯 Success Criteria

### Green Light (All Good)
- ✅ All auth tests return 200
- ✅ All unauth tests return 302→/auth or 401/403
- ✅ i18n shows 0 missing keys
- ✅ Phase 4 headers validation passed
- ✅ No tokens visible in reports

### Yellow Light (Review Needed)
- ⚠️ Some 401/403 in auth tests (RBAC misconfiguration)
- ⚠️ Missing translations found
- ⚠️ Some security headers missing
- ⚠️ Redirect loops detected

### Red Light (Critical Issues)
- ❌ Auth tests getting 401/403 across the board
- ❌ Unauth tests getting 200 (no guards)
- ❌ RLS cross-tenant writes succeeding
- ❌ Invalid webhook signatures accepted
- ❌ Critical security headers missing

## 🔄 Next Steps After Results

1. **Review Bundle JSONs**: Identify patterns in failures
2. **Phase-specific fixes**:
   - Navigation issues → Guard/redirect race conditions
   - i18n gaps → Missing translation keys
   - RBAC/RLS → Policy adjustments
   - Security headers → Server/proxy configuration

3. **Re-run after fixes**: 
   ```bash
   npm run qa:run
   ```

4. **Iterate until green** ✅

## 📚 Additional Resources

- [QA Setup Guide](./qa-setup.md)
- [Phase 4 Headers Guide](./qa-phase4-headers.md)
- [Phase 3 Upgrades](./phase3-upgrades.md)
