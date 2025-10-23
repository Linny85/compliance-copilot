import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_VERDICTS = ['pass', 'fail', 'warn'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') || '';

    const sbAuth = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const sb = createClient(url, service);

    const { data: { user } } = await sbAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { evidence_id, verdict, note } = await req.json();

    if (!evidence_id || !verdict || !ALLOWED_VERDICTS.includes(verdict)) {
      return new Response(
        JSON.stringify({ error: 'Missing/invalid fields: evidence_id, verdict (must be pass/fail/warn)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get evidence to verify tenant
    const { data: ev } = await sb
      .from('evidences')
      .select('tenant_id')
      .eq('id', evidence_id)
      .maybeSingle();

    if (!ev?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Evidence not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[review-evidence]', { evidence_id, verdict });

    // Update verdict
    const { data, error } = await sb
      .from('evidences')
      .update({
        verdict,
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        note: note ?? null,
      })
      .eq('id', evidence_id)
      .select()
      .single();

    if (error) throw error;

    console.log('[review-evidence] Updated', data.id);

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[review-evidence]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
