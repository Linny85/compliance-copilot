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
    const { record_id, question_id, evidence_id } = body;

    if (!record_id || !question_id || !evidence_id) {
      return new Response(JSON.stringify({ error: 'record_id, question_id, evidence_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify evidence tenant
    const { data: evidence } = await supabaseClient
      .from('evidences')
      .select('tenant_id')
      .eq('id', evidence_id)
      .single();

    if (!evidence || evidence.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ error: 'Evidence not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if answer exists, create if not
    const { data: existing } = await supabaseClient
      .from('dpia_answers')
      .select('record_id, question_id')
      .eq('record_id', record_id)
      .eq('question_id', question_id)
      .single();

    if (!existing) {
      // Create skeleton answer with evidence
      const { error: insertError } = await supabaseClient
        .from('dpia_answers')
        .insert({
          tenant_id,
          record_id,
          question_id,
          value: null,
          evidence_id,
        });

      if (insertError) {
        console.error('[dpia-link-evidence] Insert error:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Update existing answer with evidence
      const { error: updateError } = await supabaseClient
        .from('dpia_answers')
        .update({ evidence_id })
        .eq('record_id', record_id)
        .eq('question_id', question_id);

      if (updateError) {
        console.error('[dpia-link-evidence] Update error:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    await logEvent(supabaseClient, {
      tenant_id,
      actor_id: user.id,
      action: 'dpia.answer.link_evidence',
      entity: 'dpia_answers',
      entity_id: `${record_id}:${question_id}`,
      payload: { evidence_id },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[dpia-link-evidence] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
