# Dev Tools

## Overview

The Dev Tools page provides development utilities and environment status checks. It is only accessible in development mode (`import.meta.env.DEV`).

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

## Features

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

## Usage in Development

1. Start the dev server: `npm run dev`
2. Navigate to `/dev` (or your configured route)
3. Review environment variable status
4. Follow documentation links for configuration guidance

## Related Documentation

- [Master Password & CORS Configuration](./master-password.md#cors-configuration)
- [E2E Nightly Workflow](./master-password.md#e2e-nightly-workflow)
