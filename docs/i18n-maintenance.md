# i18n Maintenance Playbook

Quick-reference guide for routine i18n operations, schema changes, and troubleshooting.

---

## 🎯 Goals & Responsibilities

**Translation Maintainers:** Ensure locale consistency, review CI failures, coordinate translations  
**Feature Developers:** Update EN first, trigger snapshot updates on schema changes  
**CI Monitors:** Watch workflow status, escalate persistent failures  

---

## 🔄 Routine Checks

### Before Every Commit (Optional Pre-commit)

```bash
# Quick local validation
node scripts/check-dpia-keys.js

# Full check
node scripts/check-locales.js --ref en
```

### After Every PR Merge

- ✅ Verify CI badge is green on main branch
- ✅ Check for new GitHub Actions annotations
- ✅ Monitor for EN drift warnings

---

## 📝 Schema Changes (EN Reference Update)

**When:** Adding/removing/renaming keys in `public/locales/en/common.json` → `dpia` section

### Workflow

1. **Edit EN Reference**
   ```bash
   # Edit public/locales/en/common.json
   # Add/remove keys in dpia section
   ```

2. **Update Snapshot**
   ```bash
   node scripts/snapshot-dpia-keys.js --update
   ```

3. **Verify Changes**
   ```bash
   git diff scripts/dpia-keys.snapshot.json
   # Review added/removed keys
   ```

4. **Commit Both Files**
   ```bash
   git add public/locales/en/common.json scripts/dpia-keys.snapshot.json
   git commit -m "feat(i18n): add dpia.newKey to EN schema"
   ```

5. **Push & Create PR**
   ```bash
   git push
   # CI will validate snapshot matches EN
   ```

6. **Propagate to Other Locales**
   - **Option A:** Manual translation (recommended)
   - **Option B:** Auto-fill with EN fallback
     ```bash
     node scripts/check-locales.js --ref en --fix
     ```

---

## 📸 Snapshot Updates (EN Drift Handling)

**Trigger:** CI fails with "DPIA key drift detected"

### Quick Fix

```bash
# 1. Verify drift is intentional
node scripts/snapshot-dpia-keys.js
# Review added/removed keys

# 2. Update snapshot
node scripts/snapshot-dpia-keys.js --update

# 3. Commit
git add scripts/dpia-keys.snapshot.json
git commit -m "chore(i18n): update DPIA snapshot after EN schema change"
git push
```

### When NOT to Update

❌ Drift caused by accidental EN changes → **Revert EN first, then re-run**  
❌ Merge conflicts in snapshot → **Resolve conflicts, regenerate snapshot**  

---

## 🌍 New Language Onboarding

**When:** Adding a new locale (e.g., `pl` - Polish)

### Checklist

1. **Add Locale Code**
   ```typescript
   // src/i18n/languages.ts
   export const supportedLocales = [
     'en', 'de', 'sv', ..., 'pl'  // ← add here
   ] as const;
   
   export const localeLabels: Record<string, string> = {
     ...,
     pl: 'Polski (PL)'  // ← add label
   };
   ```

2. **Create Locale Directory**
   ```bash
   mkdir -p public/locales/pl
   cp public/locales/en/common.json public/locales/pl/common.json
   ```

3. **Translate Content**
   - Keep structure identical to EN
   - Preserve all `{placeholders}`
   - Maintain HTML/Markdown tags

4. **Add to Priority-2 (if applicable)**
   ```javascript
   // scripts/check-dpia-keys.js
   const PRIORITY2 = new Set([
     'bg', 'da', ..., 'pl'  // ← add here
   ]);
   ```

5. **Verify Locally**
   ```bash
   node scripts/check-dpia-keys.js
   node scripts/check-locales.js --ref en
   ```

6. **Commit & Push**
   ```bash
   git add src/i18n/languages.ts public/locales/pl scripts/check-dpia-keys.js
   git commit -m "feat(i18n): add Polish (pl) locale"
   ```

---

## 🚨 Troubleshooting CI Failures

### Error: Missing Keys

**CI Output:**
```
::error file=public/locales/da/common.json,title=Missing keys (3)::dpia.risk.low, dpia.risk.med, dpia.risk.high
```

**Fix:**
```bash
# Option 1: Manual addition to da/common.json
# Option 2: Auto-fill
node scripts/check-locales.js --ref en --fix

git add public/locales/da/common.json
git commit -m "fix(i18n): add missing keys to DA locale"
```

---

### Error: Flat dpia Keys

**CI Output:**
```
::warning file=public/locales/mt/common.json,title=Flat dpia keys::dpia.title, dpia.subtitle
```

**Fix:**
```json
// ❌ Wrong (flat at root)
{
  "appTitle": "App",
  "dpia.title": "DPIA"
}

// ✅ Correct (nested)
{
  "appTitle": "App",
  "dpia": {
    "title": "DPIA"
  }
}
```

---

### Error: Placeholder Mismatch

**CI Output:**
```
::error file=public/locales/sv/common.json,title=Missing placeholders::dpia.welcome → {appName}
```

**Fix:**
```json
// EN reference
"welcome": "Welcome to {appName}!"

// ❌ Wrong (SV)
"welcome": "Välkommen!"

// ✅ Correct (SV)
"welcome": "Välkommen till {appName}!"
```

---

### Error: EN Drift Detected

**CI Output:**
```
⚠️  DPIA key drift detected in en/common.json
📝 Added keys (2):
   + dpia.legal.reference
   + dpia.legal.contact
```

**Fix:**
```bash
# If intentional
node scripts/snapshot-dpia-keys.js --update
git add scripts/dpia-keys.snapshot.json
git commit -m "chore(i18n): update snapshot after EN schema expansion"

# If accidental
git checkout public/locales/en/common.json
git commit -m "revert(i18n): revert accidental EN schema change"
```

---

## 📋 Best Practices

### ✅ DO

- **Update EN first**, then propagate to other locales
- **Preserve placeholders exactly** as in EN (`{appName}`, `{count}`)
- **Keep HTML/Markdown tags** unchanged
- **Run local checks** before pushing
- **Update snapshot** in same PR as EN schema changes
- **Commit snapshot file** after regeneration

### ❌ DON'T

- **Don't translate placeholders** (e.g., `{appName}` → `{Appname}`)
- **Don't flatten nested structures** (e.g., `dpia` → `"dpia.title"`)
- **Don't mix EN changes with other locale updates** in one PR
- **Don't ignore CI annotations** – they point to exact issues
- **Don't update snapshot without reviewing drift**

---

## 🔧 Quick Commands Reference

| Task | Command |
|------|---------|
| Validate all locales | `node scripts/check-locales.js --ref en` |
| Check DPIA structure | `node scripts/check-dpia-keys.js` |
| Show differences | `node scripts/check-locales.js --ref en --diff` |
| Auto-fix missing keys | `node scripts/check-locales.js --ref en --fix` |
| Verify EN snapshot | `node scripts/snapshot-dpia-keys.js` |
| Update EN snapshot | `node scripts/snapshot-dpia-keys.js --update` |

---

## 📊 CI Workflow Stages

1. **Locale structure check** → All languages match EN  
2. **DPIA keyset validation** → Priority-2 languages (arrays, placeholders, nesting)  
3. **EN snapshot verification** → Detects reference drift  
4. **Annotations** → Precise error markers in GitHub UI  

**Expected behavior:**
- ✅ Green = All validations passed
- ⚠️ Yellow = Warnings (extra keys, non-blocking)
- ❌ Red = Errors (missing keys, placeholder issues, EN drift)

---

## 🕐 Estimated Time per Task

| Task | Time |
|------|------|
| Add new key to EN + snapshot update | 2-5 min |
| Propagate key to all Priority-2 locales | 15-30 min |
| Add new language (full translation) | 2-4 hours |
| Fix CI failure (missing keys) | 5-10 min |
| Fix CI failure (EN drift) | 2-5 min |

---

## 📞 Escalation

**CI persistently failing?**
1. Check GitHub Actions annotations for specific files/keys
2. Run local validation to reproduce issue
3. Review recent commits to EN reference
4. Contact i18n maintainers if issue unclear

**Need new translation?**
1. Create issue with locale code and deadline
2. Assign to translation team
3. Provide EN reference file
4. Review PR for placeholder consistency

---

**Last updated:** 2025-10-25  
**Maintainer:** i18n Team
