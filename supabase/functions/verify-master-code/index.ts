import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId, masterCode } = await req.json();

    if (!companyId || !masterCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company's master code hash
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('master_code_hash')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Company fetch error:', companyError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple hash comparison (in production, use bcrypt/argon2)
    // For now, we're doing a simple string comparison
    // TODO: Implement proper password hashing library
    const isValid = company.master_code_hash === masterCode;

    console.log('Master code verification:', { companyId, valid: isValid });

    return new Response(
      JSON.stringify({ valid: isValid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify master code error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
