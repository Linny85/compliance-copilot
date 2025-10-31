# Phase 4: Security Headers Guide

Complete guide for implementing and debugging security headers in Phase 4 testing.

## Critical Headers Overview

### 1. Content-Security-Policy (CSP)

**Purpose:** Prevents XSS and data injection attacks by controlling resource loading.

**Minimal CSP for Vite/React:**
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https:; 
  font-src 'self' data:; 
  connect-src 'self' https://*.supabase.co; 
  frame-ancestors 'none';
```

**Hardening Steps:**
1. Remove `'unsafe-inline'` from `script-src` → use nonces or hashes
2. Remove `'unsafe-inline'` from `style-src` → use CSS modules
3. Tighten `img-src` to specific domains
4. Use `frame-ancestors 'none'` or specific origins

**Common Issues:**
- **Vite HMR breaks:** Add `ws:` to `connect-src` in dev
- **Inline event handlers fail:** Move to `addEventListener()`
- **Third-party scripts fail:** Whitelist specific CDN domains

### 2. Cross-Origin-Opener-Policy (COOP)

**Purpose:** Isolates browsing context from popups/windows.

**Recommended:**
```
Cross-Origin-Opener-Policy: same-origin
```

**Alternative (if popups needed):**
```
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

**Breaks:**
- OAuth popups from different origins
- Third-party authentication flows
- Cross-origin window.opener access

### 3. Cross-Origin-Embedder-Policy (COEP)

**Purpose:** Prevents loading cross-origin resources without CORS.

**Recommended:**
```
Cross-Origin-Embedder-Policy: require-corp
```

**Breaks:**
- Third-party iframes without CORP headers
- External images/fonts without CORS
- Analytics scripts from CDNs

**Alternative (if needed):**
```
Cross-Origin-Embedder-Policy: credentialless
```

### 4. Permissions-Policy

**Purpose:** Controls browser features (geolocation, camera, mic, etc.).

**Recommended:**
```
Permissions-Policy: 
  geolocation=(), 
  microphone=(), 
  camera=(), 
  payment=(), 
  usb=(), 
  magnetometer=()
```

**Allow specific features:**
```
Permissions-Policy: geolocation=(self "https://trusted.com")
```

**Never use:**
```
Permissions-Policy: geolocation=*  ❌ (wildcard)
```

### 5. X-Content-Type-Options

**Purpose:** Prevents MIME-type sniffing.

**Always use:**
```
X-Content-Type-Options: nosniff
```

### 6. Referrer-Policy

**Purpose:** Controls how much referrer information is sent.

**Recommended:**
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Alternatives:**
- `no-referrer` - Most private, may break analytics
- `strict-origin` - Good balance
- `same-origin` - Only send to same origin

## Implementation Methods

### 1. Via index.html (Meta Tags)

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
  <meta name="referrer" content="strict-origin-when-cross-origin">
</head>
```

**Limitations:**
- Cannot set COOP/COEP via meta tags
- CSP via meta tag is less powerful than headers

### 2. Via Vite Plugin

```js
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
});
```

### 3. Via Reverse Proxy (Production)

**Nginx:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**Apache (.htaccess):**
```apache
Header set Content-Security-Policy "default-src 'self'; script-src 'self'"
Header set Cross-Origin-Opener-Policy "same-origin"
Header set Cross-Origin-Embedder-Policy "require-corp"
Header set Permissions-Policy "geolocation=(), microphone=(), camera=()"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

## Debugging Phase 4 Failures

### CSP Violations

**Browser Console:**
```
Refused to execute inline script because it violates CSP directive "script-src 'self'"
```

**Fix:**
1. Find the inline script
2. Move to external file, or
3. Add nonce: `<script nonce="RANDOM">` + CSP: `script-src 'nonce-RANDOM'`

**CSP Report-Only Mode (Testing):**
```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

### COOP/COEP Issues

**Console Error:**
```
Cross-Origin-Opener-Policy blocked access to window.opener
```

**Fix:**
- Use `same-origin-allow-popups` instead of `same-origin`
- Or remove COOP if popups critical

**COEP Loading Failures:**
```
net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep
```

**Fix:**
- Add `crossorigin="anonymous"` to `<img>`, `<script>` tags
- Ensure third-party resources send `Cross-Origin-Resource-Policy: cross-origin`
- Or use COEP: `credentialless`

### Permissions-Policy Blocks

**Console:**
```
The Permissions Policy denied the use of 'geolocation'
```

**Fix:**
- Whitelist specific origins: `geolocation=(self "https://maps.example.com")`
- Or remove feature from deny list

## Progressive Hardening Strategy

### Phase 1: Basic Headers (Start Here)
```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Phase 2: Add CSP (Report-Only)
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; report-uri /csp-report
```
→ Monitor violations for 1-2 weeks

### Phase 3: Enforce CSP
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

### Phase 4: Add COOP
```
Cross-Origin-Opener-Policy: same-origin-allow-popups
```
→ Test auth flows, popups

### Phase 5: Add COEP (Final)
```
Cross-Origin-Embedder-Policy: require-corp
```
→ Test all third-party resources

### Phase 6: Harden CSP
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-XXXXX'
```
→ Remove `'unsafe-inline'`, use nonces

## QA Phase 4 Expectations

The test expects these headers to be present and correctly configured:

```json
{
  "content-security-policy": {
    "mustInclude": ["default-src", "script-src", "frame-ancestors"]
  },
  "cross-origin-opener-policy": {
    "mustInclude": ["same-origin"]
  },
  "cross-origin-embedder-policy": {
    "mustInclude": ["require-corp"]
  },
  "permissions-policy": {
    "mustNotInclude": ["*"]
  },
  "x-content-type-options": {
    "mustInclude": ["nosniff"]
  },
  "referrer-policy": {
    "mustInclude": ["strict-origin"]
  }
}
```

## Common Hosting Platforms

### Vercel
```js
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

### Netlify
```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'"
    Cross-Origin-Opener-Policy = "same-origin"
    X-Content-Type-Options = "nosniff"
```

### Cloudflare Pages
Use Transform Rules or Workers to add headers.

## Tools & Resources

- **CSP Evaluator:** https://csp-evaluator.withgoogle.com/
- **Security Headers Checker:** https://securityheaders.com/
- **MDN CSP Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **OWASP Headers Cheatsheet:** https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html

## Next Steps

1. Run Phase 4 tests: `npm run qa:run`
2. Review header snapshot in `qa/bundles/qa-bundle-*.json`
3. Compare with expectations in `qa/tasks/phase4.headers.json`
4. Fix violations using this guide
5. Re-test until green ✅
