# i18n CI/CD Setup Documentation

## 🎯 Overview

This document describes the complete i18n sync guard infrastructure that prevents translation key regressions and ensures consistency across all languages.

## 📦 Components

### 1. PR Template
**File:** `.github/PULL_REQUEST_TEMPLATE/i18n_sync.md`

Standardized template for i18n-related pull requests with:
- Change summary checklist
- QA verification table
- Before/after screenshots requirement
- Acceptance criteria

### 2. CI Workflow
**File:** `.github/workflows/i18n-sync.yml`

Automated GitHub Actions workflow that runs on:
- Pull requests modifying `src/lib/i18n.ts` or `public/locales/**`
- Pushes to `main` branch

**Steps:**
1. Checkout repository
2. Install dependencies
3. Build TypeScript (ensure no compilation errors)
4. Check locale consistency (existing script)
5. Verify embedded translations structure (new script)
6. Report success status

### 3. Verification Scripts

#### `scripts/verify-embedded-i18n.js`
**Purpose:** Validates embedded translation structure in `src/lib/i18n.ts`

**Checks:**
- All required languages present (en, de, sv)
- All required namespaces exist in each language
- Critical keys that caused BLOCKER [B-001] are present
- Proper structure and syntax

**Exit Codes:**
- `0` - Success, all checks passed
- `1` - Validation failed, missing keys/namespaces

**Usage:**
```bash
node scripts/verify-embedded-i18n.js
```

#### `scripts/check-locales.js`
**Purpose:** Compares JSON locale files for consistency (existing)

**Usage:**
```bash
node scripts/check-locales.js --ref en --namespaces checks aiSystems common training
```

### 4. Documentation

#### `docs/i18n-workflow.md`
Complete guide for:
- Architecture explanation (embedded vs JSON)
- How to add new translations correctly
- Usage examples
- Common issues and solutions
- Best practices and conventions
- Maintenance checklist

## 🚀 Setup Instructions

### For New Projects

1. **Copy all files** from this setup:
   ```bash
   .github/workflows/i18n-sync.yml
   .github/PULL_REQUEST_TEMPLATE/i18n_sync.md
   scripts/verify-embedded-i18n.js
   docs/i18n-workflow.md
   docs/i18n-ci-setup.md
   ```

2. **Add npm scripts** to `package.json`:
   ```json
   {
     "scripts": {
       "check-locales": "node scripts/check-locales.js",
       "verify-i18n": "node scripts/verify-embedded-i18n.js",
       "i18n-check-all": "npm run verify-i18n && npm run check-locales -- --ref en"
     }
   }
   ```

3. **Enable GitHub Actions** in repository settings

4. **Create initial PR** using the template to verify setup

### For Existing Projects

If you already have i18n infrastructure:

1. **Review conflicts** between existing and new files
2. **Merge verification logic** into existing scripts
3. **Update CI workflow** to include new checks
4. **Document differences** in your project's README

## 🧪 Testing the Setup

### Local Testing

```bash
# 1. Verify embedded translations
npm run verify-i18n

# Expected output:
# ✅ Language found: en
# ✅ Language found: de
# ✅ Language found: sv
# ✅ Namespace complete: checks (found in 3 languages)
# ✅ All required i18n namespaces and critical keys present!

# 2. Check JSON locale files
npm run check-locales -- --ref en

# 3. Build to ensure TypeScript compiles
npm run build
```

### GitHub Actions Testing

1. **Push a test change** to `src/lib/i18n.ts`
2. **Create a PR** using the i18n template
3. **Verify workflow runs** in Actions tab
4. **Check all steps pass** with green checkmarks

Expected workflow output:
```
✅ Checkout repository
✅ Setup Node.js
✅ Install dependencies
✅ Check TypeScript compilation
✅ Check locale consistency
✅ Verify embedded translations exist
✅ Report status
```

## 📋 Maintenance Tasks

### Weekly

- Review i18n-related PRs for template usage
- Check for any failing CI workflows
- Update documentation if new patterns emerge

### Monthly

- Run full i18n audit: `npm run i18n-check-all`
- Review console for missing key warnings in dev
- Update critical keys list if needed

### Per Release

- [ ] Run `npm run verify-i18n`
- [ ] Test language switching in all major pages
- [ ] Verify no translation keys visible in UI
- [ ] Check console logs for warnings
- [ ] Document any new namespaces added

## 🔧 Troubleshooting

### Workflow Fails with "Missing namespace"

**Cause:** New feature added translations to JSON but not embedded

**Fix:**
1. Open `src/lib/i18n.ts`
2. Add namespace to all three languages (en, de, sv)
3. Ensure structure matches across languages
4. Commit and push

### TypeScript Build Fails

**Cause:** Syntax error in `src/lib/i18n.ts`

**Fix:**
1. Check for unclosed brackets, quotes
2. Verify all object properties have values
3. Test locally: `npm run build`
4. Fix errors before pushing

### CI Workflow Doesn't Run

**Cause:** Path filters don't match changed files

**Fix:**
1. Check `.github/workflows/i18n-sync.yml` path filters
2. Ensure your changes are in monitored paths
3. Manually trigger workflow if needed

## 📊 Success Metrics

Track these metrics to measure effectiveness:

- **Zero i18n-related production bugs** since implementation
- **100% CI pass rate** for i18n checks
- **< 5 minutes** time to add new translations
- **Zero manual review time** for translation structure

## 🎓 Training Materials

For new team members:

1. Read `docs/i18n-workflow.md` first
2. Review a successful i18n PR using the template
3. Practice adding a test translation locally
4. Submit first i18n PR with mentor review

## 📚 Reference Links

- **i18next Documentation**: https://www.i18next.com/
- **React i18next Guide**: https://react.i18next.com/
- **GitHub Actions Syntax**: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- **Project-specific**: 
  - Translation Context: `src/contexts/I18nContext.tsx`
  - i18n Init: `src/i18n/init.ts`
  - Embedded Translations: `src/lib/i18n.ts`

## 🚨 Critical Reminders

1. **Always update all three languages** (en, de, sv) simultaneously
2. **Embedded translations are the source of truth**, not JSON files
3. **Run verification before committing** i18n changes
4. **Use the PR template** for all i18n-related changes
5. **Test language switching** in browser before submitting PR

## 📝 Changelog

### 2025-10-26 - Initial Setup
- Created i18n sync guard infrastructure
- Added CI workflow with automated checks
- Resolved BLOCKER [B-001] - i18n keys exposed
- Documented complete workflow and maintenance procedures
