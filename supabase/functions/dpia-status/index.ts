import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

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
    const url = new URL(req.url);
    const record_id = url.searchParams.get('record_id');

    if (!record_id) {
      return new Response(JSON.stringify({ error: 'record_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load record
    const { data: record } = await supabaseClient
      .from('dpia_records')
      .select('id, questionnaire_id, due_at, status')
      .eq('id', record_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count required questions
    const { count: requiredCount } = await supabaseClient
      .from('dpia_questions')
      .select('*', { count: 'exact', head: true })
      .eq('questionnaire_id', record.questionnaire_id)
      .eq('required', true);

    // Count answered required questions
    const { data: answers } = await supabaseClient
      .from('dpia_answers')
      .select('question_id, dpia_questions!inner(required)')
      .eq('record_id', record_id)
      .not('value', 'is', null);

    const answeredRequired = answers?.filter((a: any) => a.dpia_questions?.required).length || 0;

    // Count evidence links
    const { count: evidenceCount } = await supabaseClient
      .from('dpia_answers')
      .select('*', { count: 'exact', head: true })
      .eq('record_id', record_id)
      .not('evidence_id', 'is', null);

    const isOverdue = record.due_at && new Date(record.due_at) < new Date();
    const progress = requiredCount ? (answeredRequired / requiredCount) * 100 : 0;

    return new Response(JSON.stringify({
      progress,
      required_total: requiredCount || 0,
      required_answered: answeredRequired,
      evidence_links: evidenceCount || 0,
      is_overdue: isOverdue,
      status: record.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[dpia-status] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
