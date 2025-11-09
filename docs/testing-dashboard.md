# Compliance Dashboard Testing Guide

## Quick Start

### 1. Seed Test Data

Run the seed script in your Supabase SQL Editor (Backend → SQL Editor):

```sql
-- Replace :USER with your actual user UUID from profiles table
-- You can get it by running: SELECT id FROM auth.users WHERE email = 'your@email.com';
```

Then paste the contents of `scripts/seed-compliance-data.sql` and execute.

### 2. Verify Dashboard

Navigate to `/dashboard` in the preview. You should see:
- Overall compliance % > 0
- NIS2, AI Act, GDPR badges with percentages > 0
- No "NaN" values
- Single language switcher (DE/EN/SV) in header only

### 3. Run E2E Tests

```bash
npx playwright test tests/e2e/dashboard-summary.spec.ts
```

### 4. Cleanup (Optional)

After testing, clean up seed data:

```bash
# In Supabase SQL Editor, run:
```

Paste contents of `scripts/cleanup-compliance-seed.sql` and execute.

## What Gets Seeded

- **Check Rules**: 10 automated compliance checks across NIS2/AI/GDPR frameworks
- **Evidence**: 5 document records (3 approved, 2 pending)
- **Training Certificates**: 3 training records (2 verified, 1 pending)

## Expected Results

After seeding, the dashboard should show:
- **Overall**: ~40-60% (weighted average of controls, evidence, training)
- **NIS2**: ~50% (2 of 4 controls with evidence)
- **AI Act**: ~33% (1 of 3 controls with evidence)
- **GDPR**: ~66% (2 of 3 controls with evidence)

*Note: Exact percentages depend on your view's aggregation logic.*

## Troubleshooting

### Still seeing 0%?

1. Check views exist:
   ```sql
   SELECT * FROM v_compliance_overview 
   WHERE tenant_id = (SELECT company_id FROM profiles WHERE id = :USER::uuid);
   ```

2. Verify seed data was inserted:
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM check_rules WHERE tenant_id = ...) as rules,
     (SELECT COUNT(*) FROM evidences WHERE tenant_id = ...) as evidence,
     (SELECT COUNT(*) FROM training_certificates WHERE tenant_id = ...) as certs;
   ```

3. Check browser console for errors

### Language switcher still duplicated?

Ensure you've removed `<LanguageSwitcher />` from:
- src/pages/Auth.tsx
- src/pages/Onboarding.tsx  
- src/pages/CompanyProfile.tsx
- src/pages/OnboardingWizard.tsx

Only `src/components/AppLayout.tsx` should have it.

---

## Automation

> ⚠️ **SECURITY WARNING: Secrets Management**  
> 
> **NEVER** paste real API keys, service role keys, passwords, or connection strings into:
> - Source code commits
> - Documentation files  
> - Chat messages or issue comments
> - Pull request descriptions
>
> **ALWAYS** use **GitHub Secrets** (Settings → Secrets → Actions):
> - `SUPABASE_PROJECT_URL` - Your Supabase project URL
> - `SUPABASE_SERVICE_ROLE` - Service role key (admin access, NEVER commit!)
> - `TENANT_USER_UUID` - Pass via workflow input (not hardcoded)
> - `E2E_MASTER_PW` - Test master password (test account only, for E2E)
>
> **Key Rotation Best Practices:**
> - Rotate immediately after suspected exposure
> - Rotate quarterly as preventive measure
> - Rotate after team member with admin access leaves
> - Use separate test accounts/projects for CI/CD
>
> **If leaked:** Immediately revoke in Supabase dashboard → update GitHub secrets → audit access logs

### Automated Seeding via Script

Instead of manually running SQL, use the automated script:

**Local execution:**

```bash
# Set required env vars
export SUPABASE_PROJECT_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE="your_service_role_key"
export TENANT_USER_UUID="your_user_uuid"

# Run seed
npm run seed:preview

# Run cleanup
npm run cleanup:preview
```

**GitHub Actions workflow:**

1. Go to **Actions** → **Seed Dashboard Test Data**
2. Click **Run workflow**
3. Select mode: `seed` or `cleanup`
4. Enter your `tenant_user_uuid`
5. Click **Run workflow**

Required secrets (Settings → Secrets):
- `SUPABASE_PROJECT_URL`
- `SUPABASE_SERVICE_ROLE`

### Debug Panel (DEV only)

Access raw compliance data in development:

1. Navigate to `/dashboard?debug=1`
2. A debug panel appears bottom-right showing:
   - Company ID
   - Raw `v_compliance_overview` JSON
   - Derived percentages (overall, NIS2, AI Act, GDPR, etc.)

**Test IDs for E2E:**
- `dbg-company-id`: Company/Tenant UUID
- `dbg-overview-json`: Raw JSON from view
- `dbg-overall`, `dbg-nis2`, `dbg-ai`, `dbg-dsgvo`: Individual percentages
- `dbg-controls`, `dbg-evidence`, `dbg-training`, `dbg-dpia`: Component scores

Remove `?debug=1` to hide the panel. Not available in production builds.

---

## Concurrent Verification (CI Matrix)

Both nightly and on-demand workflows run multiple E2E suites in parallel via GitHub Actions matrix:

### Suites

1. **master-password**: Tests master password verification flow (`tests/e2e/master-password.spec.ts`)
2. **dashboard-summary**: Tests compliance dashboard rendering and calculations (`tests/e2e/dashboard-summary.spec.ts`)

### Nightly Workflow (`.github/workflows/e2e-master-password-nightly.yml`)

Runs on `preview` branch at 02:00 UTC daily with three jobs:

**1. prepare** (runs once):
- Seeds preview data via `scripts/run-seed.ts seed`
- Creates marker artifact `seed-ok.txt`
- Requires: `PREVIEW_PG_CONNECTION`, `PREVIEW_TENANT_USER_UUID`

**2. test** (matrix: parallel):
- Downloads seed marker
- Runs each suite (master-password, dashboard-summary) concurrently
- Uploads per-suite reports: `report-master-password`, `report-dashboard-summary`
- Requires: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `E2E_MASTER_PW`

**3. teardown** (always runs):
- Cleans up preview data via `scripts/run-seed.ts cleanup`
- Sends optional Slack notification on failure (requires `SLACK_WEBHOOK_URL`)

### On-Demand Workflow (`.github/workflows/master-password-e2e.yml`)

Manually triggered or on push to relevant paths. Runs both suites in matrix without seeding (assumes data exists).

**Artifacts per suite:**
- `playwright-report-master-password` / `playwright-report-dashboard-summary`
- `test-results-master-password` / `test-results-dashboard-summary` (only on failure)

### Required Secrets (Nightly)

- `PREVIEW_PG_CONNECTION`: PostgreSQL connection string for preview environment
- `PREVIEW_TENANT_USER_UUID`: Test user UUID for seeding
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `E2E_MASTER_PW`: Test master password
- `SLACK_WEBHOOK_URL` (optional): Slack webhook for failure notifications

### Viewing Results

1. Go to **Actions** → Select workflow run
2. Download per-suite artifacts:
   - `report-master-password` → HTML report for master-password tests
   - `report-dashboard-summary` → HTML report for dashboard tests
3. If tests failed, also download `test-results-{suite}` for screenshots/videos

### Manual Trigger (Matrix)

```bash
# Trigger on-demand workflow with both suites
gh workflow run master-password-e2e.yml
```

**Note**: On-demand workflow does NOT seed/cleanup automatically. Use nightly workflow or manually seed before running.

