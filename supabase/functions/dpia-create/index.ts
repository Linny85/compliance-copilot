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
    const { title, process_id, vendor_id, owner_id, questionnaire_code = 'BASE', due_days = 30 } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lookup questionnaire
    const { data: questionnaire, error: qError } = await supabaseClient
      .from('dpia_questionnaires')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('code', questionnaire_code)
      .eq('status', 'published')
      .single();

    if (qError || !questionnaire) {
      return new Response(JSON.stringify({ error: 'Questionnaire not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const due_at = new Date();
    due_at.setDate(due_at.getDate() + due_days);

    const { data: record, error: insertError } = await supabaseClient
      .from('dpia_records')
      .insert({
        tenant_id,
        title,
        process_id: process_id || null,
        vendor_id: vendor_id || null,
        owner_id: owner_id || user.id,
        questionnaire_id: questionnaire.id,
        status: 'open',
        due_at: due_at.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[dpia-create] Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log event
    await logEvent(supabaseClient, {
      tenant_id,
      actor_id: user.id,
      action: 'dpia.create',
      entity: 'dpia_records',
      entity_id: record.id,
      payload: { title, process_id, vendor_id, questionnaire_code },
    });

    return new Response(JSON.stringify({ record }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[dpia-create] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
