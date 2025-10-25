# i18n Developer Guide

Complete guide for internationalization management in this project.

## 🗺 Overview & Workflow

This project uses a **strict i18n validation system** to ensure translation consistency across all supported locales.

**Reference Language**: `en` (English)  
**Locale Path**: `public/locales/{lang}/common.json`  
**Priority-2 Languages**: bg, da, el, et, fi, ga, hr, hu, lt, lv, mt, pt, ro, sk, sl, no, is, ca

### Validation Layers

1. **Structure Check** – All languages must match EN key structure
2. **DPIA Keyset** – Validates `dpia` object across Priority-2 languages (arrays, nesting, placeholders)
3. **EN Snapshot Guard** – Detects drift when EN reference keys change

---

## ⚙️ Core Commands

### Check All Locales (Strict)
```bash
node scripts/check-locales.js --ref en
```
Validates that all locale files match the EN reference structure.

### Show Differences
```bash
node scripts/check-locales.js --ref en --diff
```
Displays detailed key-by-key differences for debugging.

### Auto-Fix Missing Keys
```bash
node scripts/check-locales.js --ref en --fix
```
Automatically fills missing keys from EN (use with caution).

### DPIA Structure Check
```bash
node scripts/check-dpia-keys.js
```
Validates `dpia` object structure, placeholders, and nesting for Priority-2 languages.

### Verify EN Snapshot
```bash
node scripts/snapshot-dpia-keys.js
```
Checks if EN `dpia` keys have changed since last snapshot.

### Update EN Snapshot
```bash
node scripts/snapshot-dpia-keys.js --update
```
Regenerates the snapshot after intentional EN schema changes.

---

## 🧩 CI Integration

### Workflow: `.github/workflows/i18n-check.yml`

The CI runs three validation steps on every push/PR:

#### 1. Check Locales (Strict)
```yaml
- name: Check Locales (strict)
  run: node scripts/check-locales.js --ref en
```
Ensures all languages match EN key structure.

#### 2. Verify DPIA Snapshot
```yaml
- name: Verify DPIA key snapshot (EN drift)
  run: node scripts/snapshot-dpia-keys.js
```
Detects if EN `dpia` keys have been added/removed.

#### 3. DPIA Keyset Check
```yaml
- name: DPIA keyset check (Priority-2)
  env:
    FAIL_ON_PLACEHOLDER: "1"
  run: node scripts/check-dpia-keys.js
```
Validates `dpia` structure with strict placeholder enforcement.

#### 4. Show Diffs (on failure)
```yaml
- name: Show diffs if any (non-fatal)
  if: failure()
  run: node scripts/check-locales.js --ref en --diff || true
```
Provides detailed diagnostics when checks fail.

---

## 🧠 Best Practices

### ✅ DO

- **Keep structure identical** to EN across all languages
- **Translate content only**, never modify keys or structure
- **Preserve placeholders exactly** as in EN (e.g., `{appName}`, `{count}`)
- **Maintain HTML/Markdown tags** unchanged (`<strong>`, `**bold**`)
- **Use UTF-8 without BOM** for all JSON files
- **Test locally** before pushing (run `node scripts/check-dpia-keys.js`)

### ❌ DON'T

- **Don't flatten nested keys** (e.g., `"dpia.title"` on root level is wrong)
- **Don't translate placeholders** (e.g., `{appName}` → `{Appname}` breaks the app)
- **Don't add/remove keys** without updating EN first
- **Don't mix flat and nested** `dpia` structures

---

## 🚨 Common Errors & Fixes

### Error: `Missing "dpia"` 
**Problem**: Language file has no top-level `dpia` object.

**Wrong**:
```json
{
  "dpia.title": "Title",
  "dpia.subtitle": "Subtitle"
}
```

**Correct**:
```json
{
  "dpia": {
    "title": "Title",
    "subtitle": "Subtitle"
  }
}
```

---

### Error: `Flat dpia keys`
**Problem**: `dpia.*` keys exist at root level instead of nested under `dpia`.

**Wrong**:
```json
{
  "appTitle": "App",
  "dpia.title": "DPIA Title"  // ❌ flat key at root
}
```

**Correct**:
```json
{
  "appTitle": "App",
  "dpia": {
    "title": "DPIA Title"
  }
}
```

**Fix**: Move all `dpia.*` keys into a nested `dpia` object.

---

### Error: `Missing placeholders`
**Problem**: Translated string is missing placeholders that exist in EN.

**EN**:
```json
{
  "welcome": "Welcome, {userName}!"
}
```

**Wrong (DE)**:
```json
{
  "welcome": "Willkommen!"  // ❌ missing {userName}
}
```

**Correct (DE)**:
```json
{
  "welcome": "Willkommen, {userName}!"
}
```

**Fix**: Ensure all `{placeholders}` appear exactly as in EN.

---

### Error: `Extra placeholders`
**Problem**: Translated string has placeholders not present in EN.

**EN**:
```json
{
  "greeting": "Hello!"
}
```

**Wrong (FR)**:
```json
{
  "greeting": "Bonjour {userName}!"  // ❌ extra placeholder
}
```

**Correct (FR)**:
```json
{
  "greeting": "Bonjour !"
}
```

**Fix**: Remove placeholders not in the EN reference.

---

### Error: `Parse error`
**Problem**: JSON syntax error (trailing comma, unescaped quotes, BOM).

**Wrong**:
```json
{
  "title": "It's great",  // ❌ unescaped quote
  "status": "active",     // ❌ trailing comma
}
```

**Correct**:
```json
{
  "title": "It's great",
  "status": "active"
}
```

**Fix**: 
- Use double quotes for JSON strings
- Remove trailing commas
- Save files as UTF-8 without BOM

---

### Error: `Missing keys (N)`
**Problem**: Language file is missing keys that exist in EN.

**CI Output**:
```
::error file=public/locales/da/common.json,title=Missing keys (3)::dpia.risk.low, dpia.risk.med, dpia.risk.high
```

**Fix Options**:

1. **Manual**: Add missing keys to the language file
2. **Auto-fix**: Run `node scripts/check-locales.js --ref en --fix`

---

## 🤝 Updating the Snapshot (EN Drift)

When you **intentionally modify** the `dpia` structure in `en/common.json` (add/remove keys):

### Step 1: Make EN Changes
Edit `public/locales/en/common.json`:
```json
{
  "dpia": {
    "title": "DPIA",
    "newKey": "New Field"  // ← added
  }
}
```

### Step 2: Update Snapshot
```bash
node scripts/snapshot-dpia-keys.js --update
```

This regenerates `scripts/dpia-keys.snapshot.json`.

### Step 3: Commit Both Files
```bash
git add public/locales/en/common.json scripts/dpia-keys.snapshot.json
git commit -m "feat(i18n): add dpia.newKey to EN"
```

### Step 4: CI Validation
The CI will:
1. ✅ Accept the updated snapshot
2. ❌ Fail on other languages (missing `dpia.newKey`)
3. Show annotations with missing keys

### Step 5: Propagate to Other Languages
Either:
- **Manual translation**: Update each Priority-2 language
- **Auto-fill EN fallback**: `node scripts/check-locales.js --ref en --fix`

---

## 📊 CI Failure Examples

### Scenario 1: Missing DPIA Keys
```
::error file=public/locales/mt/common.json,title=Missing keys (2)::dpia.risk.critical, dpia.status.archived
```

**Action**: Add the missing keys to `mt/common.json`.

---

### Scenario 2: EN Drift Detected
```
⚠️  DPIA key drift detected in en/common.json

📝 Added keys (2):
   + dpia.legal.reference
   + dpia.legal.contact

💡 To update snapshot, run:
   node scripts/snapshot-dpia-keys.js --update
```

**Action**: Run `--update` and commit the snapshot file.

---

### Scenario 3: Placeholder Mismatch
```
::error file=public/locales/sv/common.json,title=Missing placeholders::dpia.welcome → {appName}
```

**Action**: Add `{appName}` to the Swedish translation.

---

## 🔧 Troubleshooting

### CI passes locally but fails on GitHub
- **Cause**: Different Node versions or missing files
- **Fix**: Ensure Node 20, run `npm ci` before checks

### Auto-fix creates duplicate keys
- **Cause**: Existing structure mismatch
- **Fix**: Manually resolve conflicts before running `--fix`

### Snapshot keeps failing after update
- **Cause**: Snapshot file not committed
- **Fix**: `git add scripts/dpia-keys.snapshot.json && git commit`

---

## 📦 Files Overview

| File | Purpose |
|------|---------|
| `scripts/check-locales.js` | Main locale structure validator |
| `scripts/check-dpia-keys.js` | DPIA-specific validator (Priority-2) |
| `scripts/snapshot-dpia-keys.js` | EN drift detector |
| `scripts/dpia-keys.snapshot.json` | Baseline EN `dpia` keys |
| `.github/workflows/i18n-check.yml` | CI automation |

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Validate all locales | `node scripts/check-locales.js --ref en` |
| Check DPIA structure | `node scripts/check-dpia-keys.js` |
| Show differences | `node scripts/check-locales.js --ref en --diff` |
| Auto-fill missing keys | `node scripts/check-locales.js --ref en --fix` |
| Verify EN snapshot | `node scripts/snapshot-dpia-keys.js` |
| Update EN snapshot | `node scripts/snapshot-dpia-keys.js --update` |

---

## 🚀 Ready to Deploy?

Before merging i18n changes:

1. ✅ Run `node scripts/check-dpia-keys.js` locally
2. ✅ Verify EN snapshot is current (`node scripts/snapshot-dpia-keys.js`)
3. ✅ Check CI passes (green checkmark on PR)
4. ✅ Spot-check 2-3 languages manually

---

**Need help?** Check CI logs for `::error` and `::warning` annotations pointing to exact files and keys.
