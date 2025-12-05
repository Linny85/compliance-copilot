import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS configuration with allowed origins
// Set ALLOWED_ORIGINS environment variable as comma-separated list:
// Example: "http://localhost:5173,https://preview.compliance-copilot.dev,https://app.compliance-copilot.example"
// Codespaces (*.app.github.dev) and internal *.compliance-copilot.dev hosts are allowed automatically.
// Fallback: localhost:5173 and 127.0.0.1:5173 for local development plus a production placeholder domain.
const ALLOWED_ORIGINS_ENV = Deno.env.get('ALLOWED_ORIGINS') || '';
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV 
  ? ALLOWED_ORIGINS_ENV.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://app.compliance-copilot.example',
    ];

// Helper to check if origin is allowed (supports wildcard *.app.github.dev for Codespaces)
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Codespaces: https://<port>-<id>.app.github.dev
  if (origin.endsWith('.app.github.dev')) {
    return true;
  }

  // Future Compliance Copilot preview/prod domains
  if (origin.endsWith('.compliance-copilot.dev') || origin.endsWith('.compliance-copilot.example')) {
    return true;
  }
  
  return false;
}

// Get CORS headers for specific origin
function getCorsHeaders(origin: string | null) {
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Constants for rate limiting and audit logging
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 5;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, reason: 'method_not_allowed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request
    const { company_id, password } = await req.json();

    if (!company_id || !password) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'missing_fields' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract client info for rate limiting and audit logging
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Create service role client (has access to all tables)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check persistent rate limit via database
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_mpw_rate_limit', {
        p_company_id: company_id,
        p_ip: clientIP,
        p_max_attempts: MAX_ATTEMPTS,
        p_window_minutes: WINDOW_MINUTES
      });

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for ${company_id}:${clientIP}`);
      
      // Audit log the rate limit event
      await supabase.from('mpw_audit_log').insert({
        company_id,
        ip: clientIP,
        ok: false,
        reason: 'rate_limited',
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ ok: false, reason: 'rate_limited' }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '300'
          } 
        }
      );
    }

    // Use RPC to verify password (leverages SECURITY DEFINER function)
    const { data: isValid, error: rpcError } = await supabase
      .rpc('verify_master_password', {
        p_company_id: company_id,
        p_password: password
      });

    // Determine reason for audit log
    let reason = '';
    if (rpcError) {
      console.error('RPC verification failed:', rpcError);
      reason = 'rpc_error';
    } else if (!isValid) {
      reason = 'invalid_password';
    }

    // Audit log the verification attempt
    await supabase.from('mpw_audit_log').insert({
      company_id,
      ip: clientIP,
      ok: Boolean(isValid),
      reason: reason || null,
      user_agent: userAgent
    });

    // Always return 200 with ok field to prevent timing attacks
    const remaining = rateLimitResult?.remaining ?? MAX_ATTEMPTS - 1;
    return new Response(
      JSON.stringify({ ok: Boolean(isValid) }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ ok: false, reason: 'internal_error' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
