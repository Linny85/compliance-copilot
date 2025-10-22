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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, masterCode } = await req.json();

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'No company found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify master code
    const { data: company } = await supabaseAdmin
      .from('Unternehmen')
      .select('master_code_hash')
      .eq('id', profile.company_id)
      .single();

    if (company?.master_code_hash !== masterCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid master code' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        invited_by: user.id,
        company_id: profile.company_id
      }
    });

    if (createError) {
      console.error('User creation error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        company_id: profile.company_id,
        email,
        full_name: email.split('@')[0]
      });

    // Create role
    await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        company_id: profile.company_id,
        role: role || 'member'
      });

    // Create audit log
    await supabaseAdmin.rpc('create_audit_log', {
      _company_id: profile.company_id,
      _actor_user_id: user.id,
      _action: 'user_invited',
      _target: newUser.user.id,
      _meta_json: { email, role }
    });

    console.log('User invited:', { email, role, companyId: profile.company_id });

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Invite user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
