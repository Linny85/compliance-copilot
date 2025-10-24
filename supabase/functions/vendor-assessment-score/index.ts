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
    const { assessment_id } = body;

    if (!assessment_id) {
      return new Response(JSON.stringify({ error: 'assessment_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get assessment
    const { data: assessment } = await supabaseClient
      .from('vendor_assessments')
      .select('*, vendor:vendor_id(*)')
      .eq('id', assessment_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!assessment) {
      return new Response(JSON.stringify({ error: 'Assessment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get questions and answers
    const { data: questions } = await supabaseClient
      .from('vendor_questions')
      .select('*')
      .eq('questionnaire_id', assessment.questionnaire_id);

    const { data: answers } = await supabaseClient
      .from('vendor_answers')
      .select('*')
      .eq('assessment_id', assessment_id);

    const answerMap = new Map(answers?.map(a => [a.question_id, a]) ?? []);

    // Calculate scores
    let totalScore = 0;
    let totalWeight = 0;

    for (const question of questions ?? []) {
      const answer = answerMap.get(question.id);
      if (!answer) continue;

      let normalized = 0;
      
      switch (question.type) {
        case 'bool':
          normalized = answer.value === true ? 1 : 0;
          break;
        case 'file':
          normalized = answer.evidence_id ? 1 : 0;
          break;
        case 'number':
          // Assume scale 0-10, normalize to 0-1
          normalized = Math.min(1, Math.max(0, (answer.value ?? 0) / 10));
          break;
        case 'single':
        case 'multi':
          // Simple: if answered = 1, else 0 (v1 heuristic)
          normalized = answer.value ? 1 : 0;
          break;
        default:
          normalized = answer.value ? 1 : 0;
      }

      totalScore += normalized * (question.weight ?? 1);
      totalWeight += (question.weight ?? 1);
    }

    const overall = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Determine risk level
    let riskLevel = 'critical';
    if (overall >= 0.85) riskLevel = 'low';
    else if (overall >= 0.7) riskLevel = 'med';
    else if (overall >= 0.5) riskLevel = 'high';

    // Update assessment
    const { error: updateError } = await supabaseClient
      .from('vendor_assessments')
      .update({
        status: 'scored',
        scored_at: new Date().toISOString(),
        score: { overall: overall.toFixed(2) },
        risk_level: riskLevel
      })
      .eq('id', assessment_id);

    if (updateError) {
      console.error('[vendor-assessment-score] Error updating:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await logEvent(serviceClient, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'vendor.assessment.scored',
      entity: 'vendor_assessment',
      entity_id: assessment_id,
      payload: { score: overall.toFixed(2), risk_level: riskLevel }
    });

    return new Response(JSON.stringify({
      success: true,
      score: { overall: overall.toFixed(2) },
      risk_level: riskLevel
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[vendor-assessment-score] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
