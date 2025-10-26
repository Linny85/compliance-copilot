# i18n Test PR Guide

## 🎯 Purpose

This guide walks you through creating a test PR to verify that the i18n sync guard CI workflow is operational.

## 📋 Prerequisites

- GitHub repository connected to Lovable
- CI workflows enabled in repository settings
- Local development environment set up

## 🧪 Test Procedure

### Step 1: Create Test Branch

```bash
# Create a new branch for testing
git checkout -b test/i18n-ci-verification

# Or in Lovable: The AI will create the branch automatically when you push
```

### Step 2: Add Test Translation Key

Add a dummy test key to `src/lib/i18n.ts`:

```typescript
// In src/lib/i18n.ts, add to all three languages:

export const translations = {
  en: {
    // ... existing translations
    _test: {
      ci_verification: "CI verification test key",
      timestamp: new Date().toISOString(),
    }
  },
  de: {
    // ... existing translations
    _test: {
      ci_verification: "CI-Verifikationstest-Schlüssel",
      timestamp: new Date().toISOString(),
    }
  },
  sv: {
    // ... existing translations
    _test: {
      ci_verification: "CI-verifieringstestnyckel",
      timestamp: new Date().toISOString(),
    }
  }
};
```

### Step 3: Commit and Push

```bash
git add src/lib/i18n.ts
git commit -m "test: Add dummy i18n key to verify CI workflow"
git push origin test/i18n-ci-verification
```

### Step 4: Create Pull Request

1. Go to your GitHub repository
2. Click "Pull requests" → "New pull request"
3. Select `test/i18n-ci-verification` as the source branch
4. Use the i18n PR template (should load automatically)
5. Fill in the template:
   - Summary: "Test PR to verify i18n sync guard CI workflow"
   - Changes: Added `_test` namespace with dummy keys
   - Verification: Mark all as ✅ PASS after CI runs

### Step 5: Monitor CI Workflow

Watch the GitHub Actions tab for the workflow run:

**Expected Steps:**
1. ✅ Checkout repository
2. ✅ Setup Node.js
3. ✅ Install dependencies
4. ✅ Check TypeScript compilation
5. ✅ Check locale consistency
6. ✅ Verify embedded translations exist
7. ✅ Report status

**Timeline:** Workflow should complete in 2-5 minutes

### Step 6: Verify Results

#### Success Indicators

✅ All workflow steps show green checkmarks  
✅ PR shows "All checks have passed"  
✅ Job summary shows success message  
✅ No errors in workflow logs

#### What to Screenshot

1. **PR Overview** - Showing green checkmark next to "i18n Sync Guard"
2. **Workflow Summary** - All steps passed
3. **Job Logs** - Console output showing:
   ```
   ✅ Language found: en
   ✅ Language found: de
   ✅ Language found: sv
   ✅ Namespace complete: _test (found in 3 languages)
   ✅ All required i18n namespaces and critical keys present!
   ```

### Step 7: Test Failure Scenario (Optional)

To verify the CI catches errors:

```typescript
// Remove the German translation only:
export const translations = {
  en: {
    _test: { ci_verification: "test" }
  },
  de: {
    // _test deliberately missing
  },
  sv: {
    _test: { ci_verification: "test" }
  }
};
```

Push this change - CI should **FAIL** with:
```
❌ Missing namespace in one or more languages: _test
```

### Step 8: Cleanup

After verification:

```bash
# Delete the test key from src/lib/i18n.ts
# Remove _test namespace from all languages

git add src/lib/i18n.ts
git commit -m "test: Remove test i18n keys after CI verification"
git push

# Close and delete the PR
# Delete the test branch
```

## 📊 Expected Results

### Successful Test Run

```
i18n Sync Guard (Enhanced) ✅

Jobs completed:
├─ verify-i18n ✅
   ├─ Checkout repository ✅
   ├─ Setup Node.js ✅
   ├─ Install dependencies ✅
   ├─ Check TypeScript compilation ✅
   ├─ Verify embedded translations structure ✅
   ├─ Check locale consistency ✅
   └─ Report final status ✅

Duration: ~3 minutes
```

### Verification Checklist

- [ ] CI workflow started automatically
- [ ] All steps completed successfully
- [ ] Green checkmark on PR
- [ ] No errors in logs
- [ ] Job summary generated
- [ ] Test failure scenario caught missing translations

## 🐛 Troubleshooting

### Workflow Doesn't Start

**Cause:** Path filters don't match  
**Fix:** Ensure changes are in `src/lib/i18n.ts`

### Build Fails

**Cause:** Syntax error in test key  
**Fix:** Check brackets, quotes, commas in i18n.ts

### Verification Script Fails

**Cause:** Test namespace not detected  
**Fix:** Ensure `_test` is added to all three languages

## 📝 Test Report Template

After successful test, document:

```markdown
## i18n CI Verification Test Results

**Date:** [YYYY-MM-DD]
**Tester:** [Your Name]
**Branch:** test/i18n-ci-verification
**PR:** #[PR Number]

### Results

- [ ] ✅ Workflow triggered automatically
- [ ] ✅ All checks passed
- [ ] ✅ Failure scenario caught errors
- [ ] ✅ Screenshots captured

### Screenshots

1. PR Overview - [attach]
2. Workflow Summary - [attach]
3. Detailed Logs - [attach]

### Conclusion

i18n sync guard is **OPERATIONAL** and ready for production use.

**Signed off by:** [Name]
```

## 🎉 Success Criteria

Test is considered successful when:

1. ✅ Workflow runs automatically on PR creation
2. ✅ All verification steps pass
3. ✅ Failure scenario is detected
4. ✅ Clear error messages displayed
5. ✅ Test cleanup completed

## 🔗 Related Documentation

- Main Workflow: `.github/workflows/i18n-sync-enhanced.yml`
- Weekly Health Check: `.github/workflows/i18n-health-check.yml`
- Verification Script: `scripts/verify-embedded-i18n.js`
- Full Guide: `docs/i18n-workflow.md`
