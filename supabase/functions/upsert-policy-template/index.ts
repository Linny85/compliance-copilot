import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { logEvent } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolicyTemplateRequest {
  control_id: string;
  title: string;
  body_md: string;
  valid_from?: string;
  valid_to?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's company
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'No company associated with user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PolicyTemplateRequest = await req.json();
    const { control_id, title, body_md, valid_from, valid_to } = body;

    if (!control_id || !title || !body_md) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: control_id, title, body_md' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing policy template (tenant + control)
    const { data: existing } = await supabaseAdmin
      .from('policy_templates')
      .select('id, version')
      .eq('tenant_id', profile.company_id)
      .eq('control_id', control_id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersion = existing ? existing.version + 1 : 1;

    // Create new version
    const { data: newPolicy, error: insertError } = await supabaseAdmin
      .from('policy_templates')
      .insert({
        tenant_id: profile.company_id,
        control_id,
        version: newVersion,
        title,
        body_md,
        valid_from: valid_from || new Date().toISOString().split('T')[0],
        valid_to: valid_to || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating policy template:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create policy template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit log
    await logEvent(supabaseAdmin, {
      tenant_id: profile.company_id,
      actor_id: user.id,
      action: 'policy.create',
      entity: 'policy_template',
      entity_id: newPolicy.id,
      payload: {
        control_id,
        version: newVersion,
        title,
      },
    });

    return new Response(
      JSON.stringify({ 
        policy: newPolicy,
        message: existing ? 'New version created' : 'Policy template created'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
