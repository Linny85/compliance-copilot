# Dashboard Overall Compliance – Discovery & Fix

**Date:** 2025-11-05
**Branch:** `fix/dashboard-overall-compliance-20251105`
**Issue:** Ring shows 43% (controls) instead of overall compliance ~69%

## Discovery

### Files Analyzed
- `src/components/dashboard/ComplianceProgressCard.tsx` - Main dashboard card component
- `src/hooks/useCompliance.ts` - Compliance data hook
- `src/lib/compliance/score.ts` - Score calculation utilities
- `public/locales/{de,en,sv}/dashboard.json` - i18n strings

### Current Data Bindings (Before Fix)
- **Ring:** Bound to `overall_score` from backend (0.43 = 43%)
- **Framework chips:** NIS2: 82%, AI Act: 67%, GDPR: 58%
- **Controls bar:** 43% (from `controls_score`)
- **Evidence bar:** 0% (should be "—" when no expected items)

### Screenshot Reference
User provided screenshot at 16:07 showing:
- Ring: "Overall 43%" ❌ (should be ~69% based on frameworks)
- Chips: NIS2 82% · AI Act 67% · GDPR 58% ✓
- Bars: Controls 43%, Nachweise 0% ❌

## Root Cause Analysis

### Issue 1: Ring shows Controls instead of Overall
- Backend returns `overall_score: 0.43` (likely from controls calculation)
- Frontend displays this directly without validation
- **Expected:** Average of frameworks (82+67+58)/3 ≈ 69%
- **Actual:** 43% (controls score)

### Issue 2: Evidence shows 0% instead of n/a
- When no evidence items are expected (`evidence_expected = 0`)
- Division by zero results in 0% display
- **Expected:** "—" (n/a indicator)
- **Actual:** "0%"

### Issue 3: Inconsistent data source
- Ring claims "Overall" but shows controls-specific metric
- Misleads users about true compliance status
- No fallback calculation when backend overall is inconsistent

## Fix Implementation

### 1. Created Utility Function
**File:** `src/lib/compliance/overall.ts`
- Implements `calcOverall()` with weighted averaging
- Handles null/undefined scores gracefully
- Returns null when no valid data (for "n/a" display)

### 2. Refactored Component Logic
**File:** `src/components/dashboard/ComplianceProgressCard.tsx`
- Computes `overallPercent` from framework scores
- Falls back to backend score only if reasonable (within 30pp)
- Shows "—" for evidence when denominator is 0
- Added debug logging in DEV mode

### 3. Added i18n Labels
**Files:** `public/locales/{de,en,sv}/dashboard.json`
- `complianceOverall`: "Gesamt" / "Overall" / "Totalt"
- `complianceOverallTooltip`: Explains calculation method
- Tooltip references all frameworks (NIS2, AI Act, GDPR)

### 4. Unit Tests
**File:** `src/lib/compliance/__tests__/overall.test.ts`
- Tests equal weights (default): 82/67/58 → 69%
- Tests custom weights
- Tests null/undefined handling
- Tests single framework edge case

## Verification

### Expected Results
✅ Ring shows "Gesamt" (DE) / "Overall" (EN) / "Totalt" (SV)
✅ Ring displays ~69% (average of 82/67/58)
✅ Controls bar remains 43% (unchanged)
✅ Evidence shows "—" when expected=0
✅ Framework chips remain 82% / 67% / 58%
✅ No console warnings (i18n/A11y)
✅ Language switch works (DE/EN/SV)

### Test Scenarios

#### Scenario A: Normal Operation
- Given: NIS2=82%, AI Act=67%, GDPR=58%
- When: Dashboard loads
- Then: Ring shows 69% ± 1% (rounding)

#### Scenario B: Evidence n/a
- Given: No evidence items expected
- When: Evidence bar renders
- Then: Shows "—" instead of "0%"

#### Scenario C: Language Switch
- Given: Dashboard in DE
- When: Switch to EN, then SV
- Then: Labels update, no parse errors

#### Scenario D: Backend Inconsistency
- Given: Backend returns overall_score=0 or implausible value
- When: Dashboard loads
- Then: Frontend computes from frameworks, shows computed value

### Debug Output (DEV mode)
```javascript
{
  backend: 43,           // backend overall_score (implausible)
  computed: 69,          // computed from frameworks
  final: 69,             // chosen value (computed)
  frameworks: {
    nis2: 82,
    ai: 67,
    gdpr: 58,
    raw: [...]
  },
  dpia: { total: 0, score: 0, showDpia: false },
  evidence: { score: 0, display: "—" }
}
```

## Rollback Plan
If issues arise:
```bash
git revert HEAD~5..HEAD  # Revert last 5 commits
```
Keep i18n label additions (harmless), revert only logic changes.

## Notes
- Backend `overall_score` may need recalculation on server side
- Current fix uses client-side validation and fallback
- Consider migrating calculation fully to backend in future
- Unit tests added for regression prevention
