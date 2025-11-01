import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = { password?: string };

// Simple in-memory rate limiting (5 attempts per 15 minutes)
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 5;
const bucket = new Map<string, number[]>();

function allow(ipKey: string): boolean {
  const now = Date.now();
  const arr = (bucket.get(ipKey) ?? []).filter(t => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) return false;
  arr.push(now);
  bucket.set(ipKey, arr);
  return true;
}

// Helper: Extract JWT claims from Authorization header
async function getClaims(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(
      atob(auth.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
    const auth = req.headers.get("authorization") ?? "";

    // Rate limiting
    if (!allow(`${ip}:${auth.slice(0, 16)}`)) {
      return new Response(
        JSON.stringify({ ok: false, error: "rate_limited" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT claims
    const claims = await getClaims(req);
    if (!claims?.sub || !claims?.tenant_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { password } = (await req.json().catch(() => ({}))) as Body;
    if (!password || password.length < 1) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's JWT for RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? ''
          }
        }
      }
    );

    // Call the secure verification function
    const { data, error } = await supabase.rpc('check_master_password', {
      p_tenant: claims.tenant_id,
      p_plain: password
    });

    if (error) {
      console.error('Master password verification error:', error);
      return new Response(
        JSON.stringify({ ok: false, error: "db_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ok = data === true;

    // Log audit event (optional)
    await supabase.from('audit_events').insert({
      company_id: claims.tenant_id,
      user_id: claims.sub,
      event: ok ? 'org.master.verify.ok' : 'org.master.verify.fail'
    }).catch(err => console.warn('Audit log failed:', err));

    console.log('Master password verification:', { 
      tenantId: claims.tenant_id, 
      userId: claims.sub,
      valid: ok 
    });

    return new Response(
      JSON.stringify({ ok }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Verify master password error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
