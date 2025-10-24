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
    const { record_id, answers } = body;

    if (!record_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'record_id and answers required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify record ownership
    const { data: record, error: recordError } = await supabaseClient
      .from('dpia_records')
      .select('id, tenant_id')
      .eq('id', record_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (recordError || !record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert answers in batch
    const rows = answers.map((ans: any) => ({
      tenant_id,
      record_id,
      question_id: ans.question_id,
      value: ans.value ?? null,
      evidence_id: ans.evidence_id ?? null,
    }));

    const { error: upsertError } = await supabaseClient
      .from('dpia_answers')
      .upsert(rows, { onConflict: 'record_id,question_id' });

    if (upsertError) {
      console.error('[dpia-submit] Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update record status
    const { error: updateError } = await supabaseClient
      .from('dpia_records')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', record_id);

    if (updateError) {
      console.error('[dpia-submit] Update error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await logEvent(supabaseClient, {
      tenant_id,
      actor_id: user.id,
      action: 'dpia.submitted',
      entity: 'dpia_records',
      entity_id: record_id,
      payload: { answers_count: answers.length },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[dpia-submit] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
