import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if explainability is enabled
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('explainability_enabled')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!settings?.explainability_enabled) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          top: [], 
          computed_at: new Date().toISOString(),
          message: 'Explainability disabled for this tenant'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get weighted top signals
    const { data, error } = await supabase
      .from('v_explainability_top_weighted' as any)
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        top: data?.top_signals_weighted || [],
        computed_at: data?.computed_at || new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[get-explainability-weighted] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
