# Master Password Verification

## Overview

The master password verification system provides secure authentication for sensitive operations within the organization settings. It implements multiple layers of security including rate limiting, CORS protection, and secure password hashing.

## Architecture

### Backend Paths

#### 1. SQL Function (RPC) - Fallback Method

**Function**: `public.verify_master_password(p_company_id uuid, p_password text)`

- **Security**: `SECURITY DEFINER` - runs with elevated privileges without exposing password hashes
- **Algorithm**: Uses `pgcrypto` extension with bcrypt/crypt for secure comparison
- **Access**: Granted to `anon` and `authenticated` roles
- **Returns**: `boolean` - true if password matches, false otherwise

**Usage via Supabase client:**
```typescript
const { data: isValid, error } = await supabase
  .rpc('verify_master_password', {
    p_company_id: 'uuid-here',
    p_password: 'password-here'
  });
```

#### 2. Edge Function (Preferred) - `/functions/v1/verify-master`

**Endpoint**: `POST /functions/v1/verify-master`

**Request Body:**
```json
{
  "company_id": "uuid",
  "password": "string"
}
```

**Response Format:**
```json
{
  "ok": true | false,
  "reason": "invalid_password" | "rate_limited" | "missing_fields" | "internal_error"
}
```

**HTTP Status Codes:**
- `200`: All responses (including errors) return 200 to prevent timing attacks
- `204`: CORS preflight (OPTIONS)

**Important:** This endpoint always returns HTTP 200 with the `ok` field to prevent timing-based attacks. Never rely on HTTP status codes for determining password validity.

**Rate Limiting:**
- **Limit**: 5 attempts per 5 minutes
- **Key**: `company_id` + client IP
- **Response on limit**: `{ ok: false, reason: 'rate_limited' }` with HTTP 200
- **Headers**: 
  - `X-RateLimit-Remaining`: Attempts remaining
  - `Retry-After`: Seconds until reset (diagnostic only)

**Verification Flow:**
1. Rate limit check (company_id + IP)
2. Single RPC call to `verify_master_password(p_company_id, p_password)`
3. Return `{ ok: true }` on success, `{ ok: false }` on failure

**No Prefetch:** The edge function does NOT query any table directly. All password verification logic is delegated to the SECURITY DEFINER RPC function, which is the single source of truth.

**CORS:**
- Configured via `ALLOWED_ORIGINS` environment variable (comma-separated list)
- Fallback origins: `http://localhost:5173`, `http://127.0.0.1:5173`, and wildcard `*.lovableproject.com`, `*.lovable.app`
- Supports preflight OPTIONS requests (returns 204)
- Response headers:
  - `Access-Control-Allow-Origin`: Exact origin (not `*`) for credential support
  - `Access-Control-Allow-Headers`: `authorization`, `x-client-info`, `apikey`, `content-type`
  - `Access-Control-Allow-Methods`: `POST`, `OPTIONS`
  - `Access-Control-Max-Age`: `86400` (24 hours)

**Setting ALLOWED_ORIGINS:**
```bash
# In Lovable Cloud Edge Functions (Project → Functions → Environment Variables)
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://your-preview-domain.lovableproject.com,https://your-prod-domain.com

# For local development with Supabase CLI
echo "ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173" >> supabase/.env.local
```

**Verification (curl with Origin):**

Test that CORS headers are correctly configured by simulating browser preflight and POST requests:

```bash
export SUPABASE_URL="https://<your-project>.supabase.co"
export ANON_KEY="<your-anon-key>"
export TEST_ORIGIN="https://your-preview-domain.lovableproject.com"

# Test OPTIONS preflight (should return 204 with CORS headers)
curl -i -X OPTIONS "$SUPABASE_URL/functions/v1/verify-master" \
  -H "Origin: $TEST_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,apikey,content-type"

# Expected:
# HTTP/1.1 204 No Content
# Access-Control-Allow-Origin: https://your-preview-domain.lovableproject.com
# Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
# Access-Control-Allow-Methods: POST, OPTIONS

# Test POST with Origin (should return 200 with CORS headers)
curl -i -X POST "$SUPABASE_URL/functions/v1/verify-master" \
  -H "Origin: $TEST_ORIGIN" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_id":"<test-uuid>","password":"test"}'

# Expected:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: https://your-preview-domain.lovableproject.com
# Content-Type: application/json
# {"ok":false}
```

**Note:** Preflight (OPTIONS) requests MUST receive proper CORS headers to avoid browser blocking POST requests. The edge function automatically extracts the `Origin` header and validates it against the allowed list. If the origin is not whitelisted, the fallback origin (first in `ALLOWED_ORIGINS` or `localhost:5173`) is used.

**Automated CORS Testing:**

A Node.js test script is provided to validate CORS configuration:

```bash
# Run the CORS self-test
node scripts/cors-selftest.mjs

# With custom environment variables
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_ANON_KEY="your-anon-key" \
TEST_ORIGIN="https://your-preview-domain.lovableproject.com" \
node scripts/cors-selftest.mjs
```

The script validates:
- OPTIONS preflight returns 204 with proper CORS headers
- POST request returns 200 with CORS headers and expected JSON body
- Both responses include correct `Access-Control-Allow-Origin` header

### Frontend Integration

**Service**: `src/features/security/verifyMasterPassword.ts`

```typescript
import { verifyMasterPassword } from '@/features/security/verifyMasterPassword';

const result = await verifyMasterPassword('user-entered-password');

if (result.success) {
  // Password is correct
} else {
  switch (result.error) {
    case 'invalid_password':
      // Show "Incorrect password" message
      break;
    case 'rate_limited':
      // Show "Too many attempts, try later"
      break;
    case 'service_unavailable':
      // Show "Service temporarily unavailable"
      break;
    case 'no_company':
      // Show "No company associated with account"
      break;
  }
}
```

**Error Mapping:**
- `invalid_password`: Wrong password entered
- `rate_limited`: Exceeded 5 attempts in 5 minutes
- `service_unavailable`: Network error, CORS issue, or backend down
- `no_company`: User profile has no associated company

## Testing

### Smoke Tests (Edge Function & RPC)

**Test Edge Function directly:**

```bash
# Set environment variables (replace with your actual values)
export SUPABASE_URL="https://<your-project>.supabase.co"
export SUPABASE_ANON_KEY="<your-anon-key>"
export COMPANY_ID="<your-company-uuid>"
export CORRECT_PW="<your-test-password>"

# Test 1: Wrong password → { "ok": false }
curl -s -X POST "$SUPABASE_URL/functions/v1/verify-master" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$COMPANY_ID\",\"password\":\"wrong\"}"

# Test 2: Correct password → { "ok": true }
curl -s -X POST "$SUPABASE_URL/functions/v1/verify-master" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$COMPANY_ID\",\"password\":\"$CORRECT_PW\"}"

# Test 3: Rate limit (6 rapid failures) → { "ok": false, "reason": "rate_limited" }
for i in {1..6}; do
  curl -s -X POST "$SUPABASE_URL/functions/v1/verify-master" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"company_id\":\"$COMPANY_ID\",\"password\":\"wrong\"}"
  echo ""
done
```

**Tip:** Pipe output through `| jq` for formatted JSON if you have jq installed.

**Expected Results:**
- All responses return HTTP 200 (timing attack mitigation)
- Test 1: `{ "ok": false }`
- Test 2: `{ "ok": true }`
- Test 3: Last response includes `{ "ok": false, "reason": "rate_limited" }` with headers `X-RateLimit-Remaining: 0` and `Retry-After: 300`

**Test RPC Function directly (Lovable Cloud → Database → SQL Editor):**

```sql
-- 1) Ensure pgcrypto extension is enabled (one-time setup)
create extension if not exists pgcrypto;

-- 2) Set up test password hash (TEST ENVIRONMENT ONLY!)
-- This creates a hash for password 'correct' using bcrypt
-- Replace <COMPANY_UUID> with your actual company UUID
insert into public.org_secrets (company_id, master_password_hash)
values ('<COMPANY_UUID>'::uuid, crypt('correct', gen_salt('bf')))
on conflict (company_id) do update
  set master_password_hash = excluded.master_password_hash;

-- 3) Test with wrong password (should return false)
select public.verify_master_password('<COMPANY_UUID>'::uuid, 'wrong');

-- 4) Test with correct password (should return true)
select public.verify_master_password('<COMPANY_UUID>'::uuid, 'correct');
```

**⚠️ Security Note:** The hash setup example above is for test environments only. In production, master passwords should be set through the secure UI workflow, never via direct SQL.

### E2E Testing with Playwright

**Required GitHub Secrets:**

For automated E2E testing, configure these repository secrets in Settings → Secrets → Actions:
- `SUPABASE_URL`: Your Supabase project URL (e.g., https://xxxxx.supabase.co)
- `SUPABASE_ANON_KEY`: Supabase anonymous/public key (safe to use in tests)
- `E2E_MASTER_PW`: Test master password for happy-path verification (test account only)

**⚠️ Security:**
- Never commit these values to source code
- Use separate test accounts/projects for E2E
- Rotate test credentials monthly
- If a key is leaked, immediately rotate it in Supabase dashboard

**Setup Environment Variable (Local):**
```bash
# In your .env or CI/CD secrets
E2E_MASTER_PW=YourTestMasterPassword123
```

**Run Tests:**
```bash
# All master password tests
npx playwright test tests/e2e/master-password.spec.ts

# Specific test
npx playwright test tests/e2e/master-password.spec.ts -g "incorrect password"

# With headed browser (see what's happening)
npx playwright test tests/e2e/master-password.spec.ts --headed

# With HTML report
npx playwright test tests/e2e/master-password.spec.ts --reporter=html
npx playwright show-report
```

**Test Coverage:**
- ✅ Incorrect password shows error and keeps dialog open
- ✅ Correct password closes dialog and unlocks protected fields
- ✅ Backend offline shows "service unavailable" error
- ✅ Rate limiting shows "too many attempts" after 5 failures

**Test Data IDs:**
- `mpw-dialog`: Master password dialog container
- `mpw-input`: Password input field
- `mpw-submit`: Submit button
- `mpw-error`: Error message container

### Verification Checklist

**Before deploying to production:**

1. ✅ Smoke tests pass (all 3 curl tests)
2. ✅ RPC function returns correct boolean values
3. ✅ E2E tests pass (all 4 scenarios)
4. ✅ Rate limiting works (6th attempt blocked)
5. ✅ CORS configured for production domain
6. ✅ GitHub Secrets configured (SUPABASE_URL, SUPABASE_ANON_KEY, E2E_MASTER_PW)
7. ✅ No secrets committed to source code
8. ✅ Error messages mapped correctly in UI
9. ✅ Audit logging enabled for verification attempts
10. ✅ Key rotation procedure documented

## Security Best Practices

### ✅ DO
- Always use the provided `verifyMasterPassword` utility
- Log only generic events (no PII, no passwords)
- Show consistent error messages (avoid timing attacks)
- Implement UI disabled states during verification
- Use environment variables for test credentials

### ❌ DON'T
- Never log plain text passwords
- Never expose password hashes to client
- Never bypass rate limiting for "admin" users
- Never use `console.log` with sensitive data
- Never hardcode test passwords in source code

## Troubleshooting

### Common Pitfalls

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| `{ ok: false }` for correct password | Password hash mismatch or wrong table | Verify hash in `org_secrets.master_password_hash` matches algorithm (bcrypt via `pgcrypto`) |
| `reason: "missing_fields"` | Missing `company_id` or `password` in request | Check request payload structure and frontend mapping |
| `reason: "rate_limited"` during normal use | Rate limit map not reset | Wait 5 minutes or restart edge function (in-memory state) |
| RPC returns `null` | Company not found in `org_secrets` | Insert row: `INSERT INTO org_secrets(company_id, master_password_hash) VALUES (...)` |
| CORS error in frontend | Wrong origin in `corsHeaders` | Update edge function CORS config for your domain |
| Tenant key not found | `profiles.id → company_id` mapping issue | Ensure frontend uses `.eq('id', user.id)` NOT `.eq('user_id', ...)` |
| i18n keys missing | Wrong translation namespace | Use only existing keys: `invalid_password`, `rate_limited`, `service_unavailable`, `no_company` |

**Critical Mapping Notes:**
- **Tenant Resolution**: Frontend must query `profiles` by `id` (not `user_id`) to get `company_id`
- **Hash Source**: RPC reads from `org_secrets.master_password_hash` (Edge function does NOT prefetch)
- **i18n**: No new translation keys needed—use existing error mapping from `verifyMasterPassword.ts`

### "Service Unavailable" Error

**Causes:**
1. Edge function not deployed
2. CORS misconfiguration
3. Network connectivity issues
4. Supabase project down

**Solutions:**
```bash
# Check edge function deployment
supabase functions list

# Test edge function directly
curl -v https://your-project.supabase.co/functions/v1/verify-master

# Check CORS headers in browser Network tab
# Should see: Access-Control-Allow-Origin header
```

### Key Rotation

**When to Rotate:**
- Immediately after suspected exposure
- After team member departure with admin access
- Quarterly as preventive measure
- After failed security audit

**How to Rotate:**
1. Generate new master password hash in Supabase dashboard
2. Update `E2E_MASTER_PW` secret in GitHub repository settings
3. Update `SUPABASE_ANON_KEY` if compromised (regenerate in Supabase)
4. Notify team members about credential changes
5. Verify all CI/CD pipelines still pass with new credentials

### Rate Limit Not Working

**Note**: Rate limiting is in-memory and resets on:
- Edge function cold start
- Function redeployment
- Instance restart

For production, consider using:
- Redis/Upstash for distributed rate limiting
- Deno KV for persistent storage
- Supabase Realtime for cross-instance coordination

### RPC Function Not Found

```sql
-- Verify function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'verify_master_password';

-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'verify_master_password';
```

## CI/CD Integration

### GitHub Actions Workflow

A dedicated workflow (`.github/workflows/master-password-e2e.yml`) runs automatically on:
- Pull requests affecting verification logic
- Manual workflow dispatch
- Changes to edge function or frontend security features

**Required GitHub Secrets:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `E2E_MASTER_PW`: Test master password (test environment only)

**Artifacts:**
- HTML Playwright report (30 day retention)
- Test results with screenshots/videos on failure

### Manual Workflow Trigger

```bash
# Via GitHub UI: Actions → Master Password E2E Tests → Run workflow
# Or via GitHub CLI:
gh workflow run master-password-e2e.yml
```

### Artifacts & Reports

After each workflow run (whether successful or failed):
1. Navigate to **Actions** → **Master Password E2E Tests** → Select the specific run
2. Scroll to **Artifacts** section at the bottom
3. Download:
   - **playwright-report**: HTML report with test results, traces, and screenshots (always available)
   - **test-results**: Raw screenshots/videos from failed tests (only on failure/cancellation)

**Retention**: 7 days

### Nightly CI (Preview Branch)

A separate workflow (`.github/workflows/e2e-master-password-nightly.yml`) runs automatically with concurrent test matrix:

**Schedule**: Daily at 02:00 UTC on `preview` branch

**Architecture** (prepare → test matrix → teardown):

1. **prepare** job:
   - Seeds preview data once via `scripts/run-seed.ts seed`
   - Creates marker artifact to signal seeding completion
   - Required secrets: `PREVIEW_PG_CONNECTION`, `PREVIEW_TENANT_USER_UUID`

2. **test** job (matrix):
   - Runs two suites in parallel:
     - `master-password`: Tests master password verification flow
     - `dashboard-summary`: Tests compliance dashboard rendering
   - Each suite generates separate artifacts:
     - `report-master-password` / `report-dashboard-summary` (HTML reports)
     - `test-results-master-password` / `test-results-dashboard-summary` (failure screenshots/videos)
   - Required secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `E2E_MASTER_PW`

3. **teardown** job:
   - Always runs (even on failure) to clean up preview data via `scripts/run-seed.ts cleanup`
   - Sends optional Slack notification if tests failed (requires `SLACK_WEBHOOK_URL`)

**Purpose**: Continuous validation of master-password verification AND compliance dashboard on preview environment before production deployment.

**Required Secrets**:
- `PREVIEW_PG_CONNECTION`: PostgreSQL connection string for preview
- `PREVIEW_TENANT_USER_UUID`: Test user UUID for seeding
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `E2E_MASTER_PW`: Test master password
- `SLACK_WEBHOOK_URL` (optional): Slack webhook for failure alerts

**Artifacts** (retention: 7 days):
- **report-master-password**: Master-password suite HTML report
- **report-dashboard-summary**: Dashboard suite HTML report
- **test-results-{suite}**: Screenshots/videos (only on failure)

**Manual Trigger**:
```bash
gh workflow run e2e-master-password-nightly.yml
```

**Note**: Nightly workflow automatically seeds/cleanups data. On-demand workflow (`.github/workflows/master-password-e2e.yml`) also runs both suites in matrix but does NOT seed automatically—ensure test data exists before manual runs.

### Troubleshooting CI Failures

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Timeout after 30s | Slow network or edge function cold start | Check edge function logs; increase `--timeout` if needed |
| CORS error | Preview/prod domain not whitelisted | Update `corsHeaders` in edge function to include GitHub Actions runner IP ranges |
| `mpw-dialog` not found | Test runs before UI is fully loaded | Increase `waitForLoadState` timeout or add explicit wait for route |
| Rate limit triggered immediately | Previous test run didn't clean up | Wait 5 minutes between runs or restart edge function to clear in-memory state |
| Secrets not available | GitHub Secrets not configured | Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `E2E_MASTER_PW` in repo settings |

## Migration Notes

If migrating from old system:
1. Backup existing password hashes
2. Run migration: `20250111000000_add_verify_master_password_function.sql`
3. Test RPC function with known credentials
4. Deploy edge function
5. Update frontend to use new service
6. Monitor error logs for issues
7. Keep old verification as fallback for 1 week

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [pgcrypto Extension](https://www.postgresql.org/docs/current/pgcrypto.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
