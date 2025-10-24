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
    const { assessment_id, answers } = body;

    if (!assessment_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify assessment belongs to tenant
    const { data: assessment } = await supabaseClient
      .from('vendor_assessments')
      .select('*')
      .eq('id', assessment_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!assessment) {
      return new Response(JSON.stringify({ error: 'Assessment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Upsert answers
    for (const answer of answers) {
      const { question_id, value, evidence_id } = answer;

      await supabaseClient
        .from('vendor_answers')
        .upsert({
          tenant_id: tenantId,
          assessment_id,
          question_id,
          value: value ?? null,
          evidence_id: evidence_id ?? null
        }, {
          onConflict: 'assessment_id,question_id'
        });
    }

    // Update assessment status
    const { error: updateError } = await supabaseClient
      .from('vendor_assessments')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', assessment_id);

    if (updateError) {
      console.error('[vendor-assessment-submit] Error updating assessment:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await logEvent(serviceClient, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'vendor.assessment.submitted',
      entity: 'vendor_assessment',
      entity_id: assessment_id,
      payload: { answers_count: answers.length }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[vendor-assessment-submit] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
