# QA Runner Setup & Usage

Automated QA infrastructure for Phase 1-4 testing with multi-profile support.

## Quick Start

### 1. Install Dependencies

The runner uses only Node.js built-in modules, but for Windows compatibility:

```bash
npm install --save-dev cross-env
```

### 2. Add NPM Scripts

**⚠️ Manual Step Required** - Add to `package.json` (file is read-only in Lovable):

```json
{
  "scripts": {
    "qa:run": "node ./scripts/run-qa.mjs",
    "qa:auth": "QA_RUN=auth node ./scripts/run-qa.mjs",
    "qa:unauth": "QA_RUN=unauth node ./scripts/run-qa.mjs",
    "qa:auth:win": "cross-env QA_RUN=auth node ./scripts/run-qa.mjs",
    "qa:unauth:win": "cross-env QA_RUN=unauth node ./scripts/run-qa.mjs"
  }
}
```

### 3. Set Environment Variables

#### Local (bash/zsh)
```bash
export QA_BASE_URL="https://your-host.com"
export QA_AUTH_COOKIE="sb:token=...; sb:refresh=..."
npm run qa:run
```

#### PowerShell (Windows)
```powershell
$env:QA_BASE_URL="https://your-host.com"
$env:QA_AUTH_COOKIE="sb:token=...; sb:refresh=..."
npm run qa:auth:win  # or qa:unauth:win
```

#### GitHub Actions
Settings → Secrets and variables → Actions → New repository secret:
- `QA_BASE_URL`
- `QA_AUTH_COOKIE`

## Test Phases

The runner executes all phases sequentially:

1. **Redirects** (`/admin/test-mode/redirects`) - Route guards & navigation
2. **i18n** (`/admin/test-mode/i18n`) - Translation coverage & consistency
3. **Phase 3** (`/admin/test-mode/phase3`) - Edge functions, RBAC, RLS
4. **Phase 4** (`/admin/test-mode/phase4`) - Write-safety, webhooks, security headers

## Output Structure

```
qa/
├── reports/
│   ├── redirects/
│   ├── i18n/
│   ├── phase3/
│   └── phase4/
└── bundles/
    ├── qa-bundle-auth-20250131-120000.json
    ├── qa-bundle-unauth-20250131-120000.json
    ├── qa-junit-auth-20250131-120000.xml
    └── qa-junit-unauth-20250131-120000.xml
```

## Features

### Redirect-Aware Probing
- Captures 30x responses with redirect locations
- Handles HTML error pages gracefully
- No JSON parse errors on non-JSON responses

### Security Header Snapshot
Phase 4 includes actual header validation:
- CSP (Content-Security-Policy)
- COOP (Cross-Origin-Opener-Policy)
- COEP (Cross-Origin-Embedder-Policy)
- Permissions-Policy
- X-Content-Type-Options
- Referrer-Policy

### JUnit Export
- CI-friendly test reports
- Integrates with GitHub Actions
- Test results visible in PR checks

## Troubleshooting

### Cookie Extraction

1. Open DevTools → Network tab
2. Load your app while authenticated
3. Find any request to your domain
4. Copy entire `Cookie` header value (usually `sb:token=...; sb:refresh=...`)

### Windows Issues

Use `:win` variants which use `cross-env`:
```bash
npm run qa:auth:win
```

### CI Failures

Check:
- Secrets are set correctly
- Base URL is accessible from GitHub runners
- Auth cookie hasn't expired (refresh tokens last ~30 days)

## Customization

Edit `qa/tasks/part2.tasks.json` to:
- Add/remove test phases
- Change export directories
- Modify bundle naming patterns

## Next Steps

After running:
1. Review bundle JSONs in `qa/bundles/`
2. Check individual phase reports for details
3. Share bundles for analysis and fix generation
