import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = (req.headers.get('Authorization') || '').trim();
  const sbAuth = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    // Auth check
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve tenant
    const { data: profile, error: pErr } = await sbAuth
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    const tenant_id = profile?.company_id as string | undefined;
    if (pErr || !tenant_id) {
      return new Response(JSON.stringify({ error: 'No tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { run_id } = body;

    if (!run_id) {
      return new Response(JSON.stringify({ error: 'run_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch run (tenant-scoped)
    const { data: run, error: runErr } = await sbAuth
      .from('check_runs')
      .select('id, status, window_start, window_end, requested_by, started_at, finished_at, rule_id')
      .eq('tenant_id', tenant_id)
      .eq('id', run_id)
      .maybeSingle();

    if (runErr) throw runErr;
    if (!run) {
      return new Response(JSON.stringify({ error: 'Run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch results for this run with rule + control details
    const { data: results, error: resultsErr } = await sbAuth
      .from('check_results')
      .select(`
        id,
        outcome,
        message,
        details,
        check_rules!inner(
          id,
          code,
          title,
          severity,
          kind,
          control_id,
          deleted_at,
          controls(code, title)
        )
      `)
      .eq('tenant_id', tenant_id)
      .eq('run_id', run_id)
      .is('check_rules.deleted_at', null);

    if (resultsErr) throw resultsErr;

    // Map results to flatten structure
    const mappedResults = (results || []).map((r: any) => ({
      id: r.id,
      outcome: r.outcome,
      message: r.message,
      details: r.details,
      rule: {
        id: r.check_rules.id,
        code: r.check_rules.code,
        title: r.check_rules.title,
        severity: r.check_rules.severity,
        kind: r.check_rules.kind,
        control_id: r.check_rules.control_id
      },
      control: r.check_rules.controls || null
    }));

    return new Response(JSON.stringify({
      run: {
        id: run.id,
        status: run.status,
        window_start: run.window_start,
        window_end: run.window_end,
        requested_by: run.requested_by,
        started_at: run.started_at,
        finished_at: run.finished_at
      },
      results: mappedResults
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('[get-run-details] Error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
