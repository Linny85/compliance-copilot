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
- Configured for Preview and Production domains
- Supports preflight OPTIONS requests
- Headers: `authorization`, `x-client-info`, `apikey`, `content-type`

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

### Manual Testing via curl

**Test correct password:**
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/verify-master" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "your-company-uuid",
    "password": "your-master-password"
  }'
```

**Expected Response:**
```json
{"ok": true}
```

**Test wrong password:**
```bash
# Same request with wrong password
# Expected: {"ok": false}
```

**Test rate limiting:**
```bash
# Run 6 times rapidly
# 6th request should return: {"ok": false, "reason": "rate_limited"}
```

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
