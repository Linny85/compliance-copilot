/**
 * Get a snapshot of HTTP headers from a target URL
 * Useful for security header audits (CSP, COOP, COEP, Permissions-Policy, etc.)
 */
export async function getHeadersSnapshot(targetUrl: string) {
  try {
    const res = await fetch(targetUrl, { 
      method: "HEAD", 
      redirect: "manual",
      cache: "no-store"
    });
    
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 0,
      headers: {},
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Validate security headers against expected values
 */
export function validateSecurityHeaders(headers: Record<string, string>) {
  const findings = [];
  
  // CSP
  const csp = headers['content-security-policy'] || '';
  if (!csp.includes('default-src')) {
    findings.push({ header: 'content-security-policy', issue: 'Missing default-src directive', severity: 'high' });
  }
  if (!csp.includes('script-src')) {
    findings.push({ header: 'content-security-policy', issue: 'Missing script-src directive', severity: 'high' });
  }
  if (!csp.includes('frame-ancestors')) {
    findings.push({ header: 'content-security-policy', issue: 'Missing frame-ancestors directive', severity: 'medium' });
  }
  
  // COOP
  const coop = headers['cross-origin-opener-policy'] || '';
  if (!coop.includes('same-origin')) {
    findings.push({ header: 'cross-origin-opener-policy', issue: 'Should be "same-origin"', severity: 'medium' });
  }
  
  // COEP
  const coep = headers['cross-origin-embedder-policy'] || '';
  if (!coep.includes('require-corp')) {
    findings.push({ header: 'cross-origin-embedder-policy', issue: 'Should be "require-corp"', severity: 'medium' });
  }
  
  // Permissions-Policy
  const pp = headers['permissions-policy'] || '';
  if (pp.includes('*')) {
    findings.push({ header: 'permissions-policy', issue: 'Contains wildcard (*)', severity: 'medium' });
  }
  
  // X-Content-Type-Options
  const xcto = headers['x-content-type-options'] || '';
  if (xcto !== 'nosniff') {
    findings.push({ header: 'x-content-type-options', issue: 'Should be "nosniff"', severity: 'low' });
  }
  
  // Referrer-Policy
  const rp = headers['referrer-policy'] || '';
  if (!rp.includes('strict-origin')) {
    findings.push({ header: 'referrer-policy', issue: 'Should include "strict-origin"', severity: 'low' });
  }
  
  return {
    passed: findings.length === 0,
    findings,
    score: Math.max(0, 100 - findings.length * 10)
  };
}
