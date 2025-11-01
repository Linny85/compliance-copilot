import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// PBKDF2 verification using WebCrypto
async function pbkdf2Verify(password: string, saltB64: string, hashB64: string, iter: number): Promise<boolean> {
  const pw = new TextEncoder().encode(password);
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey("raw", pw, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iter },
    key,
    256
  );
  
  const computed = btoa(String.fromCharCode(...new Uint8Array(bits)));
  
  // Timing-safe comparison
  return crypto.timingSafeEqual(
    new TextEncoder().encode(computed),
    new TextEncoder().encode(hashB64)
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Simple rate-limiting (in-memory, per IP)
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();
  const key = `vmp:${ip}`;
  
  // @ts-ignore - ephemeral global storage for demo purposes
  const tries = ((globalThis as any)[key]?.filter((t: number) => now - t < 300000) ?? []);
  if (tries.length >= 5) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Too many attempts' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  // @ts-ignore
  (globalThis as any)[key] = [...tries, now];

  try {
    // Extract JWT claims
    const claims = await getClaims(req);
    if (!claims?.sub || !claims?.tenant_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { password } = await req.json().catch(() => ({}));
    if (typeof password !== "string" || password.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Fetch company's master password data (RLS ensures tenant isolation)
    const { data: company, error: companyError } = await supabase
      .from('Unternehmen')
      .select('id, master_pass_salt, master_pass_hash, master_pass_iter')
      .eq('id', claims.tenant_id)
      .maybeSingle();

    if (companyError || !company?.master_pass_salt || !company?.master_pass_hash) {
      console.error('Company fetch error:', companyError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Master password not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password using PBKDF2
    const isValid = await pbkdf2Verify(
      password,
      company.master_pass_salt,
      company.master_pass_hash,
      company.master_pass_iter ?? 210000
    );

    // Log audit event
    await supabase.from('audit_events').insert({
      company_id: claims.tenant_id,
      user_id: claims.sub,
      event: isValid ? 'org.master.verify.ok' : 'org.master.verify.fail'
    });

    console.log('Master password verification:', { 
      companyId: claims.tenant_id, 
      userId: claims.sub,
      valid: isValid 
    });

    return new Response(
      JSON.stringify({ ok: isValid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify master code error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
