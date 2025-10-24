import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { from, to } = await req.json();

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: 'from and to timestamps are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get tenant_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Failed to determine tenant' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tenant_id = profile.company_id;

    // Call verification function
    const { data: result, error: verifyError } = await supabaseClient.rpc(
      'audit_verify_chain',
      {
        p_tenant: tenant_id,
        p_from: from,
        p_to: to,
      }
    );

    if (verifyError) {
      console.error('[audit-verify] Verification failed:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Verification failed', details: verifyError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const verification = Array.isArray(result) ? result[0] : result;

    console.log('[audit-verify] Chain verification:', verification);

    return new Response(
      JSON.stringify({
        tenant_id,
        from,
        to,
        chain_ok: verification?.ok || false,
        first_break_at: verification?.first_break_at || null,
        checked_count: verification?.checked_count || 0,
        verified_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[audit-verify] Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
