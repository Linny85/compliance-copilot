# Dev Tools

## Overview

The Dev Tools page provides development utilities and environment status checks. It is only accessible in development mode (`import.meta.env.DEV`).

## Quick Start

- **Activate DEV Overlay**: Add `?dev=1` to any URL (e.g., `http://localhost:5173/dashboard?dev=1`)
- **Toggle Overlay**: Press **Ctrl/Cmd + D**
- **Dev Route**: Navigate to **/dev** (only available in DEV builds)

## Access

**Recommended approach:** Create a dedicated dev route in your routing configuration:

```tsx
// Example: In your router setup
{
  path: '/dev',
  element: import.meta.env.DEV ? <DevToolsPage /> : null,
}
```

Or use a query parameter approach:

```tsx
// Example: Conditional rendering based on URL param
const searchParams = new URLSearchParams(window.location.search);
if (import.meta.env.DEV && searchParams.get('dev') === '1') {
  return <DevToolsPage />;
}
```

## Modules

### Env Vars Status Panel

Shows the presence/absence of critical environment variables:

**Frontend vars (readable):**
- `VITE_SUPABASE_URL` – Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – Supabase anonymous key

**Server/CI vars (informational only):**
- `ALLOWED_ORIGINS` – Edge function CORS configuration (server-only)
- `PREVIEW_PG_CONNECTION` – PostgreSQL connection for CI seeding (CI-only)
- `PREVIEW_TENANT_USER_UUID` – Tenant UUID for E2E tests (CI-only)

**Security note:** No actual secret values are exposed—only present/absent status for frontend vars. Server/CI vars show as "n/a" since they cannot be read from the browser.

### Edge Function Tests

Provides smoke tests for backend functions:
- **Edge POST**: Test `verify-master` edge function with custom Origin header
- **RPC Test**: Test `verify_master_password` RPC function via Supabase client

Both tests use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables. No secrets are displayed or logged.

### DB Query Inspector (Read-Only)

Filtered read-only access to whitelisted database views:
- `v_compliance_overview`
- `summary_overview`
- `summary_controls`
- `summary_evidence`
- `summary_training`

Supports optional `tenant_id` filtering and configurable result limits (1-100). No mutating queries are possible.

### Feature Flag Tester (Local Simulation)

Test feature flags with local overrides:
- Reads flags from optional `feature_flags` table (if available)
- Allows local simulation without changing server state
- Shows effective flag values (local override > server value > default)
- Local overrides only affect DEV mode and don't persist

## Usage in Development

1. Start the dev server: `npm run dev`
2. Add `?dev=1` to any URL to activate the floating overlay
3. Navigate to `/dev` for the full dev tools page
4. Use individual panels:
   - **Env Vars**: Check environment configuration
   - **Edge Tests**: Test backend functions (verify-master)
   - **DB Query Inspector**: Query whitelisted views
   - **Feature Flags**: Test flag behavior locally

## Security

- No secrets are displayed or logged in any panel
- All panels are DEV-only (`import.meta.env.DEV`)
- DB Query Inspector: read-only access to whitelisted views only
- Feature Flag Tester: local overrides don't modify server state
- CORS validation runs separately via `scripts/cors-selftest.mjs` (CI & optional pre-commit)

## Related Documentation

- [Master Password & CORS Configuration](./master-password.md#cors-configuration)
- [E2E Nightly Workflow](./master-password.md#e2e-nightly-workflow)
