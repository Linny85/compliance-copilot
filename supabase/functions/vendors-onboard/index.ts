import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tenantId = profile.company_id;
    const body = await req.json();
    const {
      name,
      category = 'SaaS',
      criticality = 'med',
      data_classes = [],
      owner_id,
      profile_code = 'BASE'
    } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Vendor name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if vendor exists (idempotent)
    const { data: existing } = await supabaseClient
      .from('vendors')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', name)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Vendor already exists', vendor_id: existing.id }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create vendor
    const { data: vendor, error: vendorError } = await supabaseClient
      .from('vendors')
      .insert({
        tenant_id: tenantId,
        name,
        category,
        criticality,
        data_classes,
        owner_id: owner_id ?? user.id,
        status: 'new'
      })
      .select()
      .single();

    if (vendorError) {
      console.error('[vendors-onboard] Error creating vendor:', vendorError);
      return new Response(JSON.stringify({ error: vendorError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get vendor profile & questionnaire
    const { data: vendorProfile } = await supabaseClient
      .from('vendor_profiles')
      .select('questionnaire_id')
      .eq('tenant_id', tenantId)
      .eq('code', profile_code)
      .single();

    let questionnaireId = vendorProfile?.questionnaire_id;

    // If no questionnaire, create default one
    if (!questionnaireId) {
      const { data: defaultQuestionnaire } = await supabaseClient
        .from('vendor_questionnaires')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'published')
        .limit(1)
        .single();

      questionnaireId = defaultQuestionnaire?.id;
    }

    if (!questionnaireId) {
      console.warn('[vendors-onboard] No questionnaire available');
    }

    // Create initial assessment (if questionnaire exists)
    let assessment = null;
    if (questionnaireId) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 14); // 14 days

      const { data: newAssessment, error: assessmentError } = await supabaseClient
        .from('vendor_assessments')
        .insert({
          tenant_id: tenantId,
          vendor_id: vendor.id,
          questionnaire_id: questionnaireId,
          status: 'open',
          assigned_to: owner_id ?? user.id,
          due_at: dueAt.toISOString()
        })
        .select()
        .single();

      if (assessmentError) {
        console.error('[vendors-onboard] Error creating assessment:', assessmentError);
      } else {
        assessment = newAssessment;
      }
    }

    // Audit logs
    await logEvent(serviceClient, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'vendor.create',
      entity: 'vendor',
      entity_id: vendor.id,
      payload: { name, category, criticality, data_classes }
    });

    if (assessment) {
      await logEvent(serviceClient, {
        tenant_id: tenantId,
        actor_id: user.id,
        action: 'vendor.assessment.open',
        entity: 'vendor_assessment',
        entity_id: assessment.id,
        payload: { vendor_id: vendor.id, questionnaire_id: questionnaireId }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      vendor,
      assessment
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[vendors-onboard] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
