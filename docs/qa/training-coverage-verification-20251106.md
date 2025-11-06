# Training Coverage 1.1 - Verification Report

## Overview
Training coverage implementation with role/sector-based needs assessment for NIS2/AI Act/GDPR compliance.

## Schema Changes ✓
- ✅ `organization.employee_count` added (optional denominator for legacy coverage)
- ✅ `profiles.role`, `profiles.sector`, `profiles.training_exempt` added
- ✅ `training_needs_matrix` table created with healthcare/pharmacy defaults
- ✅ Views created: `v_training_cert_agg`, `training_needs_summary`, `training_coverage_summary`

## Backend Logic ✓
- ✅ Coverage based on **required personnel** per framework (not total employees)
- ✅ Healthcare/pharmacy staff marked as NIS2+GDPR+AI_ACT required
- ✅ Null-safe calculations: missing data → NULL, not 0%
- ✅ Framework-specific percentages: `training_pct_nis2`, `training_pct_ai_act`, `training_pct_gdpr`
- ✅ Overall: `(participants_total / sum(required))` × 100

## Frontend Integration ✓
- ✅ `useTrainingCoverage` hook extracts coverage data from summary
- ✅ Dashboard shows training percentage with tooltip (participants/required)
- ✅ Displays "—" when no requirements defined or no data available
- ✅ i18n strings added (DE/SV)

## Test Scenarios

### Scenario 1: Healthcare Organization
**Setup:**
- 5 pharmacy_staff (role=pharmacy_staff, sector=healthcare)
- 2 completed NIS2 certificates
- 1 completed GDPR certificate
- 1 completed AI_ACT certificate

**Expected:**
- NIS2: 2/5 = 40%
- GDPR: 1/5 = 20%  
- AI_ACT: 1/5 = 20%
- Overall: 4/15 = 27%

### Scenario 2: IT Company
**Setup:**
- 3 developers (role=developer, sector=it) → AI_ACT + GDPR required
- 2 sysadmins (role=sysadmin, sector=it) → NIS2 + GDPR required
- 3 AI_ACT certs, 4 GDPR certs, 2 NIS2 certs

**Expected:**
- AI_ACT: 3/3 = 100%
- GDPR: 4/5 = 80%
- NIS2: 2/2 = 100%
- Overall: 9/10 = 90%

### Scenario 3: No Requirements
**Setup:**
- 10 profiles with no role/sector set
- 5 training certificates exist

**Expected:**
- All framework percentages: NULL (shown as "—")
- Tooltip: "No requirements defined"

## Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Coverage based on required personnel | ✅ | Uses needs_matrix × profiles |
| Healthcare/pharmacy recognized | ✅ | Seeded in matrix |
| Dashboard shows percentage + tooltip | ✅ | With participants/required |
| Missing data shows "—" not 0% | ✅ | Null-safe throughout |
| Compliance summary extended | ✅ | New fields available |
| No i18n/A11y warnings | ✅ | All strings defined |
| QA documentation | ✅ | This file |

## Known Limitations
1. **Initial State**: Organizations need to set `role` and `sector` on profiles for coverage to calculate
2. **Matrix Maintenance**: Admin UI for training_needs_matrix not included (direct SQL for now)
3. **Certificate Framework Mapping**: Relies on `training_certificates.framework` field being populated

## Rollback Instructions
```sql
-- Drop views
DROP VIEW IF EXISTS training_coverage_summary CASCADE;
DROP VIEW IF EXISTS training_needs_summary CASCADE;
DROP VIEW IF EXISTS v_training_cert_agg CASCADE;

-- Drop table
DROP TABLE IF EXISTS training_needs_matrix CASCADE;

-- Remove columns (optional)
ALTER TABLE profiles DROP COLUMN IF EXISTS role;
ALTER TABLE profiles DROP COLUMN IF EXISTS sector;
ALTER TABLE profiles DROP COLUMN IF EXISTS training_exempt;
ALTER TABLE organization DROP COLUMN IF EXISTS employee_count;
```

## Next Steps
1. Populate `profiles.role` and `profiles.sector` for existing organizations
2. Ensure `training_certificates.framework` is set on upload
3. Consider admin UI for managing training_needs_matrix
4. Monitor coverage trends over time
