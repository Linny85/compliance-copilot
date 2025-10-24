import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenant_id = profile.company_id;
    const body = await req.json();
    const { record_id } = body;

    if (!record_id) {
      return new Response(JSON.stringify({ error: 'record_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify record
    const { data: record } = await supabaseClient
      .from('dpia_records')
      .select('id, tenant_id, questionnaire_id, owner_id')
      .eq('id', record_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load questions
    const { data: questions } = await supabaseClient
      .from('dpia_questions')
      .select('*')
      .eq('questionnaire_id', record.questionnaire_id);

    // Load answers
    const { data: answers } = await supabaseClient
      .from('dpia_answers')
      .select('*')
      .eq('record_id', record_id);

    const answerMap = new Map(answers?.map(a => [a.question_id, a]) || []);

    let totalWeight = 0;
    let totalScore = 0;
    let impact: number | null = null;
    let likelihood: number | null = null;

    for (const q of questions || []) {
      const ans = answerMap.get(q.id);
      if (!ans || !ans.value) continue;

      const weight = Number(q.weight || 1);
      totalWeight += weight;

      let norm = 0;
      switch (q.type) {
        case 'bool':
          norm = ans.value === true ? 1 : 0;
          break;
        case 'file':
          norm = ans.evidence_id ? 1 : 0;
          break;
        case 'number': {
          const val = Number(ans.value || 0);
          const scale = q.options?.scale || { min: 0, max: 10 };
          norm = (val - scale.min) / (scale.max - scale.min);
          break;
        }
        case 'single': {
          const choices = q.options?.choices || [];
          const selected = choices.find((c: any) => c.key === ans.value);
          norm = selected?.good ? 1 : 0;
          break;
        }
        case 'multi': {
          const choices = q.options?.choices || [];
          const selectedKeys = Array.isArray(ans.value) ? ans.value : [];
          const goodCount = selectedKeys.filter((k: string) => choices.find((c: any) => c.key === k)?.good).length;
          norm = selectedKeys.length > 0 ? goodCount / selectedKeys.length : 0;
          break;
        }
        case 'text':
          norm = ans.value ? 1 : 0;
          break;
      }

      totalScore += norm * weight;

      // Special handling for IMPACT/LIKELIHOOD
      if (q.code === 'IMPACT') impact = norm;
      if (q.code === 'LIKELIHOOD') likelihood = norm;
    }

    const overall = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Risk level
    let risk_level = 'critical';
    if (overall >= 0.85) risk_level = 'low';
    else if (overall >= 0.7) risk_level = 'med';
    else if (overall >= 0.5) risk_level = 'high';

    const score: Record<string, number> = { overall };
    if (impact !== null) score.impact = impact;
    if (likelihood !== null) score.likelihood = likelihood;

    // Update record
    const { error: updateError } = await supabaseClient
      .from('dpia_records')
      .update({
        status: 'scored',
        scored_at: new Date().toISOString(),
        score,
        risk_level,
      })
      .eq('id', record_id);

    if (updateError) {
      console.error('[dpia-score] Update error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create mitigation task if high/critical
    if (risk_level === 'high' || risk_level === 'critical') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await supabaseClient.from('tasks').insert({
        tenant_id,
        title: `DPIA Mitigation Required`,
        description: `DPIA scored as ${risk_level}. Review and implement mitigation measures.`,
        kind: 'dpia.mitigation',
        ref_table: 'dpia_records',
        ref_id: record_id,
        assigned_to: record.owner_id || user.id,
        due_at: dueDate.toISOString(),
        status: 'open',
      });

      await logEvent(supabaseClient, {
        tenant_id,
        actor_id: user.id,
        action: 'dpia.mitigation.open',
        entity: 'tasks',
        entity_id: record_id,
        payload: { risk_level, overall },
      });
    }

    await logEvent(supabaseClient, {
      tenant_id,
      actor_id: user.id,
      action: 'dpia.scored',
      entity: 'dpia_records',
      entity_id: record_id,
      payload: { score, risk_level },
    });

    return new Response(JSON.stringify({ score, risk_level }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[dpia-score] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
