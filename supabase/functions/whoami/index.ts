import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization') || null;

    const client = (supabaseUrl && supabaseAnonKey)
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader ?? '' } }
        })
      : null;

    const user = client ? (await client.auth.getUser()).data?.user ?? null : null;

    return new Response(
      JSON.stringify({
        ok: true,
        hasAuthHeader: Boolean(authHeader?.startsWith('Bearer ')),
        authHeaderPrefix: authHeader ? authHeader.slice(0, 12) : null,
        userId: user?.id ?? null,
        email: user?.email ?? null,
        envOk: Boolean(supabaseUrl && supabaseAnonKey),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Whoami error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
