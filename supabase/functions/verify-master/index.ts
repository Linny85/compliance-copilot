import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS configuration with allowed origins
// Set ALLOWED_ORIGINS environment variable as comma-separated list:
// Example: "http://localhost:5173,https://preview.lovableproject.com,https://prod.example.com"
// Wildcards *.lovableproject.com and *.lovable.app are checked separately in isOriginAllowed()
// Fallback: localhost:5173 and 127.0.0.1:5173 for local development
const ALLOWED_ORIGINS_ENV = Deno.env.get('ALLOWED_ORIGINS') || '';
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV 
  ? ALLOWED_ORIGINS_ENV.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

// Helper to check if origin is allowed (supports wildcard *.lovableproject.com)
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Check wildcard patterns
  if (origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')) {
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

// In-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // Reset window
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

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

    // Rate limiting key: company_id + IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `${company_id}:${clientIP}`;
    
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      console.warn(`Rate limit exceeded for ${rateLimitKey}`);
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

    // Create service role client (has access to all tables)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use RPC to verify password (leverages SECURITY DEFINER function)
    // This is the single source of truth for password verification
    const { data: isValid, error: rpcError } = await supabase
      .rpc('verify_master_password', {
        p_company_id: company_id,
        p_password: password
      });

    if (rpcError) {
      console.error('RPC verification failed:', rpcError);
      return new Response(
        JSON.stringify({ ok: false }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateCheck.remaining.toString()
          } 
        }
      );
    }

    // Always return 200 with ok field to prevent timing attacks
    return new Response(
      JSON.stringify({ ok: Boolean(isValid) }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateCheck.remaining.toString()
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
