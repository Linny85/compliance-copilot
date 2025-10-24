import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 6;

interface QueueEvent {
  id: number;
  tenant_id: string;
  run_id: string;
  status: string;
  rule_code: string | null;
  started_at: string | null;
  finished_at: string | null;
  attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only service role allowed
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      return new Response(JSON.stringify({ error: 'Service role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[process-run-events] Starting batch processing...');

    // Fetch due events
    const { data: batch, error: fetchErr } = await sb
      .from('run_events_queue')
      .select('*')
      .is('processed_at', null)
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!batch || batch.length === 0) {
      console.log('[process-run-events] No events to process');
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[process-run-events] Processing ${batch.length} events`);

    let processed = 0;
    let failed = 0;

    // Process each event
    for (const ev of batch as QueueEvent[]) {
      try {
        // Fetch tenant settings
        const { data: settings } = await sb
          .from('tenant_settings')
          .select('notification_email, notification_webhook_url, webhook_secret, webhook_domain_allowlist')
          .eq('tenant_id', ev.tenant_id)
          .maybeSingle();

        // Auto-create deviation for critical failures
        if (ev.status === 'failed' || ev.status === 'error') {
          // Get check run details
          const { data: run } = await sb
            .from('check_runs')
            .select('rule_id')
            .eq('id', ev.run_id)
            .single();

          if (run?.rule_id) {
            // Get rule severity
            const { data: rule } = await sb
              .from('check_rules')
              .select('severity, control_id, title')
              .eq('id', run.rule_id)
              .single();

            // Create deviation for high/critical severity
            if (rule && (rule.severity === 'high' || rule.severity === 'critical')) {
              // Check for existing open deviation
              const { data: existingDeviation } = await sb
                .from('deviations')
                .select('id')
                .eq('tenant_id', ev.tenant_id)
                .eq('control_id', rule.control_id)
                .in('status', ['draft', 'in_review', 'approved', 'active'])
                .maybeSingle();

              if (!existingDeviation) {
                // Create auto-deviation
                const now = new Date();
                const sla_due_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const valid_to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                const recert_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                const { error: deviationError } = await sb
                  .from('deviations')
                  .insert({
                    tenant_id: ev.tenant_id,
                    control_id: rule.control_id,
                    title: `Auto-deviation: ${rule.title || 'Check failure'}`,
                    description: `Automatically created from check run ${ev.run_id} due to ${rule.severity} severity failure.`,
                    severity: rule.severity,
                    status: 'in_review',
                    requested_by: '00000000-0000-0000-0000-000000000000', // System user placeholder
                    valid_from: now.toISOString(),
                    valid_to: valid_to.toISOString(),
                    sla_due_at: sla_due_at.toISOString(),
                    recert_at: recert_at.toISOString(),
                    source: {
                      type: 'auto',
                      check_run_id: ev.run_id,
                      rule_id: run.rule_id,
                      trigger: 'critical_fail'
                    }
                  });

                if (!deviationError) {
                  console.log(`[process-run-events] Created auto-deviation for control ${rule.control_id}`);
                } else {
                  console.error('[process-run-events] Failed to create auto-deviation:', deviationError);
                }
              } else {
                // Log suppressed duplicate
                console.log(`[process-run-events] Suppressed duplicate deviation for control ${rule.control_id}`);
                await sb.from('audit_log').insert({
                  tenant_id: ev.tenant_id,
                  actor_id: '00000000-0000-0000-0000-000000000000',
                  action: 'deviation.duplicate_suppressed',
                  entity: 'deviation',
                  entity_id: existingDeviation.id,
                  payload: { check_run_id: ev.run_id, rule_id: run.rule_id }
                });
              }
            }
          }
        }

        // Skip if no notification configured
        if (!settings?.notification_email && !settings?.notification_webhook_url) {
          await sb
            .from('run_events_queue')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', ev.id);
          processed++;
          continue;
        }

        // Call notify-run-status
        const notifyPayload = {
          run_id: ev.run_id,
          tenant_id: ev.tenant_id,
          status: ev.status,
          rule_code: ev.rule_code,
          started_at: ev.started_at,
          finished_at: ev.finished_at
        };

        const notifyUrl = `${SUPABASE_URL}/functions/v1/notify-run-status`;
        const notifyRes = await fetch(notifyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notifyPayload)
        });

        if (!notifyRes.ok) {
          const errorText = await notifyRes.text();
          throw new Error(`Notify failed: ${notifyRes.status} - ${errorText}`);
        }

        // Mark as processed
        await sb
          .from('run_events_queue')
          .update({ 
            processed_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', ev.id);

        processed++;
        console.log(`[process-run-events] Processed event ${ev.id}`);

      } catch (err: any) {
        failed++;
        const attempts = (ev.attempts || 0) + 1;
        const backoffMin = Math.min(60, Math.pow(2, attempts)); // Exponential backoff: 1,2,4,8,16,32,60 min
        const nextAttempt = new Date(Date.now() + backoffMin * 60 * 1000);

        const errorMsg = String(err.message || err).substring(0, 500);
        console.error(`[process-run-events] Error processing event ${ev.id}:`, errorMsg);

        // Move to dead-letter queue after max attempts
        if (attempts >= MAX_ATTEMPTS) {
          console.error(`[process-run-events] Max attempts reached for event ${ev.id}, moving to DLQ`);
          
          // Insert into dead-letter queue
          await sb.from('run_events_deadletter').insert({
            original_id: ev.id,
            tenant_id: ev.tenant_id,
            run_id: ev.run_id,
            status: ev.status,
            rule_code: ev.rule_code,
            started_at: ev.started_at,
            finished_at: ev.finished_at,
            attempts,
            last_error: errorMsg
          });

          // Mark original as processed
          await sb
            .from('run_events_queue')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', ev.id);
        } else {
          // Retry with backoff
          await sb
            .from('run_events_queue')
            .update({
              attempts,
              last_error: errorMsg,
              next_attempt_at: nextAttempt.toISOString()
            })
            .eq('id', ev.id);
        }
      }
    }

    console.log(`[process-run-events] Completed: ${processed} processed, ${failed} failed`);

    return new Response(JSON.stringify({ 
      processed, 
      failed,
      total: batch.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('[process-run-events] Fatal error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
