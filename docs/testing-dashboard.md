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
