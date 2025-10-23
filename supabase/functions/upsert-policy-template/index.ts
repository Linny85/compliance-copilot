import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { logEvent } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolicyTemplateRequest {
  controlId: string;
  title: string;
  bodyMd: string;
  validFrom?: string;
  validTo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[upsert-policy-template] Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      console.error('[upsert-policy-template] No tenant found for user');
      return new Response(
        JSON.stringify({ error: 'No company associated with user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = profile.company_id;

    const body: PolicyTemplateRequest = await req.json();
    const { controlId, title, bodyMd, validFrom, validTo } = body;

    console.log('[upsert-policy-template] Request:', { tenantId, controlId, title });

    // Check if policy template already exists for this tenant and control
    const { data: existingTemplate } = await supabaseAdmin
      .from('policy_templates')
      .select('id, version')
      .eq('tenant_id', tenantId)
      .eq('control_id', controlId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    let action: string;

    if (existingTemplate) {
      // Create new version
      const newVersion = existingTemplate.version + 1;
      console.log('[upsert-policy-template] Creating new version:', newVersion);

      const { data, error } = await supabaseAdmin
        .from('policy_templates')
        .insert({
          tenant_id: tenantId,
          control_id: controlId,
          version: newVersion,
          title,
          body_md: bodyMd,
          valid_from: validFrom || new Date().toISOString().split('T')[0],
          valid_to: validTo,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      action = 'policy_template.create_version';
    } else {
      // Create first version
      console.log('[upsert-policy-template] Creating first version');

      const { data, error } = await supabaseAdmin
        .from('policy_templates')
        .insert({
          tenant_id: tenantId,
          control_id: controlId,
          version: 1,
          title,
          body_md: bodyMd,
          valid_from: validFrom || new Date().toISOString().split('T')[0],
          valid_to: validTo,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      action = 'policy_template.create';
    }

    // Log audit event
    await logEvent(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: user.id,
      action,
      entity: 'policy_template',
      entity_id: result.id,
      payload: {
        controlId,
        version: result.version,
        title,
      },
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      user_agent: req.headers.get('user-agent') || undefined,
    });

    console.log('[upsert-policy-template] Success:', { id: result.id, version: result.version });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[upsert-policy-template] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
