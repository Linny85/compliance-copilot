# i18n JSON Parse Error - Troubleshooting Guide

## Quick Fix (Run These Commands)

### 1. Validate all locale files
```bash
node tools/validate-locales.mjs
```

This will show:
- ✅ Valid files
- ❌ Files with JSON syntax errors (with line context)
- ⚠️ Files with trailing commas or unescaped quotes

### 2. Auto-fix formatting issues
```bash
npx prettier --write public/locales/**/*.json
```

This will:
- Remove trailing commas
- Fix indentation
- Normalize quote usage
- Ensure consistent formatting

### 3. Verify fix in browser
- Hard reload: `Ctrl/Cmd + Shift + R`
- Check console for `[i18n] JSON parse failed` errors
- Navigate through all routes to ensure translations load

## Enhanced Error Detection

### Runtime Logging (DEV only)
The i18n parser now logs detailed error context:
```
[i18n] JSON parse failed: {
  languages: 'de',
  namespaces: 'common',
  error: 'Unexpected token } in JSON at position 270'
}
[i18n] Raw data (first 200 chars): { "key": "value", }
```

### Validation Script
The validator now shows:
- Exact file path with error
- Line number and error message
- 5 lines of context around the error
- Warnings for common issues

Example output:
```
❌  public/locales/de/common.json
   → Unexpected token } in JSON at position 270
   Context:
        267:       "nis2": "NIS2",
        268:       "ai_act": "AI Act",
        269:       "gdpr": "GDPR",
    >>>  270:     },
        271:     "breakdown": {
```

## Common JSON Errors

### 1. Trailing Comma
**Error:** `Unexpected token } in JSON`
```json
{
  "key": "value",  ← Remove this comma
}
```

**Fix:** Remove comma before closing brace/bracket

### 2. Unescaped Quotes
**Error:** `Unexpected token in JSON`
```json
{
  "text": "He said "hello""  ← Escape inner quotes
}
```

**Fix:**
```json
{
  "text": "He said \"hello\""
}
```

### 3. Missing Comma
**Error:** `Unexpected token`
```json
{
  "key1": "value1"  ← Add comma here
  "key2": "value2"
}
```

**Fix:** Add comma between properties

### 4. Comments (Not Allowed in JSON)
```json
{
  // This is a comment  ← Remove
  "key": "value"
}
```

**Fix:** Remove all comments

## Prevention

### Pre-commit Hook
Already configured in `.husky/pre-commit` and `.lintstagedrc.json`:
- Validates all JSON files before commit
- Blocks commits with invalid JSON
- Auto-runs on staged locale files

### CI/CD
GitHub Actions (`.github/workflows/i18n-check.yml`):
- Validates on every push to main
- Validates on all PRs
- Blocks merge if validation fails

### Prettier Config
`.prettierrc.json` enforces:
- No trailing commas in JSON
- Consistent indentation (2 spaces)
- Max line width: 120 chars

## Cache Busting

If errors persist after fixes, the browser may have cached old files.

**Version bump** in `src/i18n/init.ts`:
```ts
queryStringParams: {
  v: import.meta.env.DEV ? String(Date.now()) : '20251106b'  // Increment letter
}
```

## Manual Investigation

### 1. Check Network Tab
DevTools → Network → filter by `locales`:
- Look for red (4xx/5xx) responses
- Click on each JSON file → Preview tab
- If preview shows "Error parsing", that's your culprit

### 2. Check Console
Look for:
- `[i18n] JSON parse failed:` with file context
- `SyntaxError: Unexpected token`
- Line number and position

### 3. Isolate the File
```bash
# Test specific file
node -e "console.log(JSON.parse(require('fs').readFileSync('public/locales/de/common.json', 'utf8')))"
```

## Support Matrix

| Error Location | Tool | Command |
|---|---|---|
| Pre-commit | Validator | `node tools/validate-locales.mjs` |
| CI/CD | GitHub Actions | Runs automatically |
| Runtime | Browser Console | Check `[i18n]` logs |
| Manual | Prettier | `npx prettier --write public/locales/**/*.json` |
| Manual | Node | `node -e "JSON.parse(require('fs').readFileSync('file.json', 'utf8'))"` |

## Emergency Recovery

If all else fails:

1. **Restore from Git**
   ```bash
   git checkout HEAD -- public/locales/
   ```

2. **Regenerate from base language**
   ```bash
   node scripts/check-locales.js --ref en --fix
   ```

3. **Validate clean slate**
   ```bash
   node tools/validate-locales.mjs
   ```
