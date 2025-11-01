import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEvent } from "../_shared/audit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = { password?: string };

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

async function argon2Verify(hash: string, password: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const computed = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  
  if (hash.length !== computed.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ computed.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ ok: false, error: 'no_tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!allow(`${ip}:${user.id.slice(0, 16)}`)) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { password } = await req.json();
    if (!password || password.length < 1) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: secret } = await supabase
      .from('org_secrets')
      .select('master_hash')
      .eq('tenant_id', profile.company_id)
      .single();

    if (!secret?.master_hash) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ok = await argon2Verify(secret.master_hash, password);

    await logEvent(supabase, {
      tenant_id: profile.company_id,
      actor_id: user.id,
      action: ok ? 'org.master.verify.ok' : 'org.master.verify.fail',
      entity: 'org_secrets',
      entity_id: profile.company_id
    });

    return new Response(JSON.stringify({ ok }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Verify master password error:', error);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
