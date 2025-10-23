import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

type Rule = {
  id: string;
  tenant_id: string;
  control_id: string;
  code: string;
  kind: 'static' | 'query' | 'http' | 'script';
  spec: any;
  enabled: boolean;
  severity: string;
};

function windowFor(period: 'hourly' | 'daily' | 'weekly' | 'ad-hoc'): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'hourly') {
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    return { start, end };
  }
  if (period === 'daily') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }
  if (period === 'weekly') {
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  // ad-hoc: 5-minute window for idempotency
  const start = new Date(now.getTime() - 5 * 60 * 1000);
  const end = now;
  return { start, end };
}

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

    const { data: profile } = await sb
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'No tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant_id = profile.company_id;

    const body = await req.json().catch(() => ({}));
    const period = (body.period ?? 'ad-hoc') as 'hourly' | 'daily' | 'weekly' | 'ad-hoc';
    const onlyRuleIds: string[] | undefined = body.rule_ids;
    const { start, end } = windowFor(period);

    console.log('[run-checks]', { tenant_id, period, window: { start, end }, onlyRuleIds });

    // Load enabled rules
    let q = sb.from('check_rules').select('*').eq('tenant_id', tenant_id).eq('enabled', true);
    if (onlyRuleIds?.length) q = q.in('id', onlyRuleIds);
    const { data: rules, error: rerr } = await q;
    if (rerr) throw rerr;

    const results: any[] = [];
    let anyFail = false;
    let anyWarn = false;

    for (const rule of (rules as Rule[])) {
      // Idempotency: find or create run record
      const { data: existing } = await sb
        .from('check_runs')
        .select('id,status')
        .eq('tenant_id', tenant_id)
        .eq('rule_id', rule.id)
        .eq('window_start', start.toISOString())
        .eq('window_end', end.toISOString())
        .maybeSingle();

      let runId: string;
      if (existing?.id) {
        runId = existing.id;
        console.log('[run-checks] Reusing existing run', runId, 'status:', existing.status);
        if (existing.status === 'success') {
          results.push({ rule_id: rule.id, code: rule.code, outcome: 'pass', message: 'Run already completed for window' });
          continue;
        }
      } else {
        const { data: run } = await sb
          .from('check_runs')
          .insert({
            tenant_id,
            rule_id: rule.id,
            requested_by: user.id,
            window_start: start.toISOString(),
            window_end: end.toISOString(),
          })
          .select()
          .single();
        runId = run.id;
        console.log('[run-checks] Created new run', runId);
      }

      // Execute rule
      let outcome: 'pass' | 'fail' | 'warn' = 'pass';
      let message = '';
      let details: any = {};

      try {
        if (rule.kind === 'static') {
          // Example: spec = { metric: "password_rotation_days", value: 92, op: "<=", threshold: 90 }
          const { value, op, threshold, metric } = rule.spec || {};
          const cmp = (a: number, b: number, op: string) =>
            op === '<=' ? a <= b : op === '<' ? a < b : op === '>=' ? a >= b : op === '>' ? a > b : op === '==' ? a === b : false;
          const ok = typeof value === 'number' && typeof threshold === 'number' && cmp(value, threshold, op || '<=');
          outcome = ok ? 'pass' : rule.severity === 'high' || rule.severity === 'critical' ? 'fail' : 'warn';
          message = ok
            ? `Metric ${metric ?? 'value'} (${value}) complies with threshold ${op ?? '<='} ${threshold}.`
            : `Metric ${metric ?? 'value'} (${value}) violates threshold ${op ?? '<='} ${threshold}.`;
          details = { metric, value, op, threshold };
        }

        if (rule.kind === 'query') {
          // Simplified query execution (count-based for now)
          // In production, use predefined views or stored procedures
          const { table, threshold } = rule.spec || {};
          const { count, error: qerr } = await sb
            .from(table || 'evidences')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant_id)
            .eq('control_id', rule.control_id);

          if (qerr) throw qerr;

          const c = typeof count === 'number' ? count : 0;
          const min = typeof threshold === 'number' ? threshold : 1;
          const ok = c >= min;
          outcome = ok ? 'pass' : rule.severity === 'high' || rule.severity === 'critical' ? 'fail' : 'warn';
          message = ok ? `Query passed: ${c} records found` : `Query failed: ${c} records (expected >= ${min})`;
          details = { count: c, threshold: min, table: table || 'evidences' };
        }

        // Save result
        await sb.from('check_results').insert({
          run_id: runId,
          rule_id: rule.id,
          tenant_id,
          outcome,
          message,
          details,
        });

        // Track overall outcome
        if (outcome === 'fail') anyFail = true;
        if (outcome === 'warn') anyWarn = true;

        results.push({ rule_id: rule.id, code: rule.code, outcome, message });
      } catch (execErr: any) {
        console.error('[run-checks] Execution failed for rule', rule.code, execErr);

        await sb.from('check_results').insert({
          run_id: runId,
          rule_id: rule.id,
          tenant_id,
          outcome: 'fail',
          message: `Execution error: ${execErr.message}`,
          details: { error: execErr.message },
        });

        anyFail = true;
        results.push({ rule_id: rule.id, code: rule.code, outcome: 'fail', message: execErr.message });
      }
    }

    // Determine final aggregated status for all runs
    let finalStatus: 'success' | 'failed' | 'partial' = 'success';
    if (anyFail) finalStatus = 'failed';
    else if (anyWarn) finalStatus = 'partial';

    // Update all runs with final status (only open runs to avoid race conditions)
    if (results.length > 0) {
      const runIds = results.map(r => r.rule_id);
      const { data: runsToUpdate } = await sb
        .from('check_runs')
        .select('id, finished_at, status')
        .eq('tenant_id', tenant_id)
        .in('rule_id', runIds)
        .eq('window_start', start.toISOString())
        .eq('window_end', end.toISOString());

      const openRunIds = (runsToUpdate || [])
        .filter(r => !r.finished_at || r.status !== 'success')
        .map(r => r.id);

      if (openRunIds.length) {
        await sb
          .from('check_runs')
          .update({ status: finalStatus, finished_at: new Date().toISOString() })
          .in('id', openRunIds);
      }
    }

    return new Response(
      JSON.stringify({ window: { start, end }, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[run-checks]', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
