# Edge Function RBAC Template

Ready-to-use authentication and authorization patterns for Supabase Edge Functions.

## Quick Copy-Paste Guards

### 1. Basic Auth Check (Any Logged-In User)

```typescript
Deno.serve(async (req) => {
  // Extract JWT claims
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = auth.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) {
    return new Response('Invalid token', { status: 401 });
  }

  let claims: any;
  try {
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    claims = JSON.parse(payload);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  const userId = claims.sub;
  if (!userId) {
    return new Response('Invalid token', { status: 401 });
  }

  // User is authenticated - proceed with business logic
  // ...
});
```

### 2. Role-Based Access Control (RBAC)

```typescript
const ROLE_ORDER = ['viewer', 'member', 'manager', 'admin'] as const;

function hasRoleAtLeast(
  roles: string[] | undefined,
  need: 'viewer' | 'member' | 'manager' | 'admin'
): boolean {
  if (!roles || roles.length === 0) {
    return need === 'viewer';
  }
  
  const userRole = roles.find(r => ROLE_ORDER.includes(r as any));
  if (!userRole) return false;
  
  const userIndex = ROLE_ORDER.indexOf(userRole as any);
  const needIndex = ROLE_ORDER.indexOf(need);
  
  return userIndex >= needIndex;
}

Deno.serve(async (req) => {
  // Get auth header
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse JWT
  const token = auth.slice(7);
  let claims: any;
  try {
    const payload = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    claims = JSON.parse(payload);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  // Check role
  const roles = claims?.app_metadata?.roles ?? [];
  if (!hasRoleAtLeast(roles, 'manager')) {
    return new Response('Forbidden', { status: 403 });
  }

  // User is authenticated AND has manager role or higher
  // ...
});
```

### 3. Tenant Isolation Check

```typescript
Deno.serve(async (req) => {
  // Parse claims (using pattern from above)
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = auth.slice(7);
  let claims: any;
  try {
    const payload = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    claims = JSON.parse(payload);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  const tenantId = claims?.tenant_id;
  if (!tenantId) {
    return new Response('No tenant context', { status: 403 });
  }

  // RLS will automatically filter by tenant_id in JWT
  // But you can also explicitly filter if needed
  const { data, error } = await supabaseAdmin
    .from('evidences')
    .select('*')
    .eq('tenant_id', tenantId); // Explicit tenant filter

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Complete Reusable Helper (Inline)

```typescript
// Copy this into any edge function that needs auth

interface AuthContext {
  userId: string;
  tenantId: string | null;
  roles: string[];
  claims: any;
}

function getAuthContext(req: Request): AuthContext | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  try {
    const token = auth.slice(7);
    const payload = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(payload);
    
    const userId = claims.sub;
    if (!userId) return null;

    return {
      userId,
      tenantId: claims.tenant_id ?? null,
      roles: claims.app_metadata?.roles ?? [],
      claims
    };
  } catch {
    return null;
  }
}

function hasRoleAtLeast(roles: string[], need: string): boolean {
  const order = ['viewer', 'member', 'manager', 'admin'];
  const userRole = roles.find(r => order.includes(r)) ?? 'viewer';
  return order.indexOf(userRole) >= order.indexOf(need);
}

// Usage in edge function:
Deno.serve(async (req) => {
  const ctx = getAuthContext(req);
  
  if (!ctx) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  if (!hasRoleAtLeast(ctx.roles, 'manager')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Authorized with manager role or higher
  const { userId, tenantId } = ctx;
  // ... business logic
});
```

## Status Code Convention

**CRITICAL:** Always use consistent status codes for auth/authz:

- **401 Unauthorized** → No valid JWT token present
  ```ts
  return new Response('Unauthorized', { status: 401 });
  ```

- **403 Forbidden** → Valid token but insufficient permissions
  ```ts
  return new Response('Forbidden', { status: 403 });
  ```

- **200 OK** → Authorized and successful
  ```ts
  return new Response(JSON.stringify(data), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
  ```

**Never do:**
```ts
// ❌ WRONG - Don't return 200 with error message
return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 200 });

// ❌ WRONG - Don't use 500 for auth errors
return new Response('Auth failed', { status: 500 });
```

## Testing Auth Guards

Use Phase 3 tests to verify:

```bash
# Should return 401 when not authenticated
curl -X POST https://your-host.com/functions/v1/your-function

# Should return 403 when authenticated but wrong role
curl -X POST https://your-host.com/functions/v1/your-function \
  -H "Authorization: Bearer <member-token>"

# Should return 200 when authenticated with correct role
curl -X POST https://your-host.com/functions/v1/your-function \
  -H "Authorization: Bearer <manager-token>"
```

## Common Mistakes

### 1. Forgetting to Check Auth
```ts
// ❌ BAD - No auth check
Deno.serve(async (req) => {
  const { data } = await supabase.from('sensitive_data').select('*');
  return new Response(JSON.stringify(data));
});

// ✅ GOOD - Auth checked first
Deno.serve(async (req) => {
  const ctx = getAuthContext(req);
  if (!ctx) return new Response('Unauthorized', { status: 401 });
  
  const { data } = await supabase.from('sensitive_data').select('*');
  return new Response(JSON.stringify(data));
});
```

### 2. Weak Role Checks
```ts
// ❌ BAD - Only checks if role exists
if (roles.includes('admin')) { /* ... */ }

// ✅ GOOD - Uses hierarchy
if (hasRoleAtLeast(roles, 'manager')) { /* ... */ }
```

### 3. Ignoring Tenant Context
```ts
// ❌ BAD - No tenant filtering
const { data } = await supabase.from('notes').select('*');

// ✅ GOOD - Explicit tenant filter (RLS provides additional layer)
const { data } = await supabase
  .from('notes')
  .select('*')
  .eq('tenant_id', ctx.tenantId);
```

## Next Steps

1. Copy appropriate pattern into your edge function
2. Test with Phase 3 QA suite
3. Verify 401/403/200 status codes are correct
4. Ensure RLS policies are active (Phase 4 tests)
