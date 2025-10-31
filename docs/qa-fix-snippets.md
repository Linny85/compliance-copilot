# QA Fix Snippets Package

Complete, ready-to-deploy fixes for the 4 most common QA findings.

## Table of Contents
1. [Guard Race Conditions](#1-guard-race-conditions)
2. [i18n Missing Keys](#2-i18n-missing-keys)
3. [RBAC/RLS Security](#3-rbac-rls-security)
4. [CSP Headers](#4-csp-headers)

---

## 1. Guard Race Conditions

### Problem
Flash of protected content before redirect ("kurz sichtbar → zurück")

### Root Cause
- Auth state checked in `useEffect` → async → render happens first
- Multiple auth checks race each other
- Navigation triggered after render

### Solution: `ProtectedRoute` Component

**File:** `src/components/guards/ProtectedRoute.tsx`

**Key Features:**
- Waits for definitive auth state (`authReady`)
- No render until certain → no flash
- Uses `<Navigate replace/>` → no race conditions
- Role-based access control built-in

**Usage in App.tsx:**

```tsx
import ProtectedRoute from '@/components/guards/ProtectedRoute';

function App() {
  const { i18nReady } = useI18nReady();
  const { authReady, isAuthed, hasRole } = useAuth();

  // Wait for both i18n and auth to be ready
  if (i18nReady === null || authReady === null) {
    return null; // Or <LoadingScreen />
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            authReady={authReady}
            isAuthed={isAuthed}
            hasRole={hasRole}
            minRole="member"
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute
            authReady={authReady}
            isAuthed={isAuthed}
            hasRole={hasRole}
            minRole="admin"
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

**Auth Hook Pattern:**

```tsx
// src/hooks/useAuth.tsx
export function useAuth() {
  const [authReady, setAuthReady] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthReady(true); // NOW we know
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthed = !!session;
  
  const hasRole = (need: Role) => {
    const roles = session?.user?.app_metadata?.roles ?? [];
    return roleAtLeast(roles, need);
  };

  return { authReady, isAuthed, user, session, hasRole };
}
```

---

## 2. i18n Missing Keys

### Problem
- Translations missing in some locales
- App crashes on missing keys
- Hard to track which keys are missing

### Solution 1: Build-Time Validation

**File:** `scripts/i18n-check.mjs`

**Usage:**
```bash
npm run i18n:check
```

**Add to package.json:**
```json
{
  "scripts": {
    "i18n:check": "node scripts/i18n-check.mjs",
    "prebuild": "npm run i18n:check"
  }
}
```

**CI Integration:**
```yaml
# .github/workflows/i18n-check.yml
- name: Check i18n completeness
  run: npm run i18n:check
```

### Solution 2: Runtime Safety

**File:** `src/utils/i18nSafe.ts`

**Usage:**
```tsx
import { tSafe, tWithDefault } from '@/utils/i18nSafe';
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      {/* Safe - won't crash if key missing */}
      <h1>{tSafe(t, 'nav.dashboard')}</h1>
      
      {/* With custom fallback */}
      <p>{tWithDefault(t, 'features.newFeature', 'Coming Soon')}</p>
    </div>
  );
}
```

---

## 3. RBAC/RLS Security

### Problem
- Cross-tenant data leaks
- Missing role checks in edge functions
- Inconsistent permission logic

### Solution 1: Database RLS Helper

**File:** `supabase/migrations/99999999999999_rls_helpers.sql`

**Apply to your tables:**
```sql
-- One-liner to secure a table
SELECT public.enforce_tenant_rls('public.my_table'::regclass, 'tenant_id');
```

**What it creates:**
- SELECT policy → users see only their tenant
- INSERT policy → users can only insert for their tenant
- UPDATE policy → users can only update their tenant's data
- DELETE policy → users can only delete their tenant's data

**Manual customization:**
```sql
-- Custom policy for managers
CREATE POLICY "managers_see_all" ON public.reports
FOR SELECT
USING (
  public.jwt_tenant_id()::text = tenant_id::text
  OR 'manager' = ANY(public.jwt_roles())
);
```

### Solution 2: Edge Function RBAC

**File:** `supabase/functions/_shared/utils/auth.ts`

**Usage in Edge Functions:**

```ts
import { requireRole, getAuthContext } from '../_shared/utils/auth.ts';

Deno.serve(async (req) => {
  // Quick guard - returns error response if unauthorized
  const authError = requireRole(req, 'manager');
  if (authError) return authError;
  
  // Or get full context for complex logic
  const ctx = getAuthContext(req);
  if (!ctx) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Use context
  const { userId, tenantId, roles } = ctx;
  
  // Business logic here - RLS will further restrict DB access
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('tenant_id', tenantId);
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Status Code Convention:**
- **401 Unauthorized** → No valid JWT token
- **403 Forbidden** → Valid token but insufficient role
- **200 OK** → Authorized and successful

---

## 4. CSP Headers

### Problem
- Phase 4 tests show missing security headers
- CSP too permissive or completely missing
- Different configuration needed per environment

### Solutions by Platform

#### Vercel

**File:** `vercel.json`

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'nonce-__NONCE__'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.postmarkapp.com; frame-ancestors 'none';"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

#### Nginx

**File:** `nginx.conf` or site config

```nginx
# Inside server or location block
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-$request_id'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.postmarkapp.com; frame-ancestors 'none'" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options "nosniff" always;
```

#### Vite (Development)

**File:** `vite.config.ts`

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https://*.supabase.co",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Content-Type-Options': 'nosniff'
    }
  }
});
```

**Note:** Dev CSP is more permissive for HMR/hot reload

### CSP Customization Guide

**Adding domains to `connect-src`:**
```
connect-src 'self' 
  https://*.supabase.co 
  https://api.postmarkapp.com 
  https://analytics.yourdomain.com
  https://cdn.yourdomain.com;
```

**Adding CDN to `script-src`:**
```
script-src 'self' 
  'nonce-__NONCE__' 
  https://cdn.jsdelivr.net;
```

**Adding fonts from external domain:**
```
font-src 'self' 
  data: 
  https://fonts.gstatic.com;
```

---

## Mapping Bundle Results to Fixes

### Reading Bundle JSONs

When you share bundle JSONs, look for these patterns:

**1. Guard Race (auth/redirects = 200, unauth/redirects = 302)**
- ✅ Expected: unauth → 302 to /auth
- ✅ Expected: auth → 200 on protected pages
- ❌ Problem: auth → 401/403 unexpectedly
- **Fix:** Check `ProtectedRoute` implementation + `authReady` timing

**2. i18n (phase = i18n)**
- ✅ Expected: `body.missingKeys = []` or `= 0`
- ❌ Problem: `body.missingKeys > 0`
- **Fix:** Run `npm run i18n:check`, fill missing keys

**3. RBAC/RLS (auth/phase3)**
- ✅ Expected: 200 with role, 403 without role
- ❌ Problem: 200 when should be 403
- ❌ Problem: 403 when should be 200
- **Fix:** Check edge function `requireRole()` call + RLS policies

**4. Security Headers (phase4)**
- ✅ Expected: `validation.passed = true`
- ❌ Problem: `validation.findings.length > 0`
- **Fix:** Add missing headers per platform (see above)

### Example Bundle Analysis

```json
{
  "profile": "auth",
  "results": [
    {
      "phase": "redirects",
      "status": 401,  // ❌ Should be 200
      "body": {...}
    },
    {
      "phase": "phase4",
      "body": {
        "validation": {
          "passed": false,
          "findings": [
            {
              "header": "content-security-policy",
              "issue": "Missing default-src directive"
            }
          ]
        }
      }
    }
  ]
}
```

**Diagnosis:**
1. Auth redirects → 401: Check auth token freshness, verify JWT claims
2. Phase 4 CSP missing: Add CSP header in hosting config

---

## Quick Reference

| Finding | File to Edit | Key Fix |
|---------|-------------|---------|
| Guard race | `src/components/guards/ProtectedRoute.tsx` | Wait for `authReady` |
| Missing i18n keys | `public/locales/*/common.json` | Run `npm run i18n:check` |
| Cross-tenant leak | `supabase/migrations/...sql` | `SELECT enforce_tenant_rls(...)` |
| Edge function RBAC | `supabase/functions/.../index.ts` | `requireRole(req, 'manager')` |
| Missing CSP | `vercel.json` or `nginx.conf` | Add header config |

---

## Next Steps

1. Run QA tests: `npm run qa:auth && npm run qa:unauth`
2. Share bundle JSONs
3. Get targeted fix diffs with exact file paths and line numbers
4. Apply fixes
5. Re-run tests until green ✅
