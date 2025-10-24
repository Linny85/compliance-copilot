import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

const WINDOW_SOON_DAYS = Number(Deno.env.get('EVIDENCE_SOON_DAYS') ?? '14');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service role required for cross-tenant operations
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey
    );

    console.log('[evidence-expiry-cron] Starting expiry check...');

    const now = new Date();
    const nowIso = now.toISOString();
    const soonDate = new Date(now.getTime() + WINDOW_SOON_DAYS * 24 * 60 * 60 * 1000);
    const soonIso = soonDate.toISOString();

    let expiredCount = 0;
    let scheduledCount = 0;

    // 1) EXPIRED: expires_at < now AND review_status != 'expired' AND NOT locked
    const { data: expired, error: expErr } = await sb
      .from('evidences')
      .select('id, tenant_id, control_id, uploaded_by, expires_at, review_status, locked')
      .lt('expires_at', nowIso)
      .neq('review_status', 'expired')
      .eq('locked', false)
      .limit(100); // Process in batches

    if (expErr) {
      console.error('[evidence-expiry-cron] Failed to fetch expired:', expErr);
      throw expErr;
    }

    console.log(`[evidence-expiry-cron] Found ${expired?.length || 0} expired evidences`);

    for (const ev of expired ?? []) {
      try {
        // Lock and mark as expired
        const { error: updateErr } = await sb
          .from('evidences')
          .update({
            locked: true,
            review_status: 'expired',
          })
          .eq('id', ev.id);

        if (updateErr) {
          console.error(`[evidence-expiry-cron] Failed to update evidence ${ev.id}:`, updateErr);
          continue;
        }

        // Create task
        const { error: taskErr } = await sb.from('tasks').insert({
          tenant_id: ev.tenant_id,
          kind: 'evidence.expired',
          ref_table: 'evidences',
          ref_id: ev.id,
          assignee_id: ev.uploaded_by,
          status: 'open',
          due_at: nowIso,
          payload: {
            control_id: ev.control_id,
            expires_at: ev.expires_at,
          },
        });

        if (taskErr) {
          console.error(`[evidence-expiry-cron] Failed to create task for ${ev.id}:`, taskErr);
          continue;
        }

        // Audit log
        await logEvent(sb, {
          tenant_id: ev.tenant_id,
          actor_id: '00000000-0000-0000-0000-000000000000', // System
          action: 'evidence.expired',
          entity: 'evidence',
          entity_id: ev.id,
          payload: {
            control_id: ev.control_id,
            expires_at: ev.expires_at,
          },
        });

        expiredCount++;
        console.log(`[evidence-expiry-cron] Marked evidence ${ev.id} as expired`);
      } catch (err: any) {
        console.error(`[evidence-expiry-cron] Error processing expired ${ev.id}:`, err);
      }
    }

    // 2) SOON DUE: now <= expires_at <= soon, schedule review task (if not yet scheduled)
    const { data: soonDue, error: soonErr } = await sb
      .from('evidences')
      .select('id, tenant_id, control_id, uploaded_by, expires_at, review_status, locked')
      .gte('expires_at', nowIso)
      .lte('expires_at', soonIso)
      .eq('review_status', 'pending')
      .eq('locked', false)
      .limit(100);

    if (soonErr) {
      console.error('[evidence-expiry-cron] Failed to fetch soon-due:', soonErr);
      throw soonErr;
    }

    console.log(`[evidence-expiry-cron] Found ${soonDue?.length || 0} soon-due evidences`);

    for (const ev of soonDue ?? []) {
      try {
        // Check if review task already exists (idempotent)
        const { data: existingTask } = await sb
          .from('tasks')
          .select('id')
          .eq('tenant_id', ev.tenant_id)
          .eq('ref_table', 'evidences')
          .eq('ref_id', ev.id)
          .eq('kind', 'evidence.review')
          .in('status', ['open', 'in_progress'])
          .limit(1);

        if (existingTask && existingTask.length > 0) {
          console.log(`[evidence-expiry-cron] Review task already exists for ${ev.id}`);
          continue;
        }

        // Create review task
        const { error: taskErr } = await sb.from('tasks').insert({
          tenant_id: ev.tenant_id,
          kind: 'evidence.review',
          ref_table: 'evidences',
          ref_id: ev.id,
          assignee_id: ev.uploaded_by,
          status: 'open',
          due_at: ev.expires_at,
          payload: {
            control_id: ev.control_id,
            expires_at: ev.expires_at,
          },
        });

        if (taskErr) {
          console.error(`[evidence-expiry-cron] Failed to create review task for ${ev.id}:`, taskErr);
          continue;
        }

        // Update evidence status
        const { error: updateErr } = await sb
          .from('evidences')
          .update({
            review_status: 'scheduled',
            review_due_at: ev.expires_at,
          })
          .eq('id', ev.id);

        if (updateErr) {
          console.error(`[evidence-expiry-cron] Failed to update evidence status for ${ev.id}:`, updateErr);
          continue;
        }

        // Audit log
        await logEvent(sb, {
          tenant_id: ev.tenant_id,
          actor_id: '00000000-0000-0000-0000-000000000000', // System
          action: 'evidence.review.scheduled',
          entity: 'evidence',
          entity_id: ev.id,
          payload: {
            control_id: ev.control_id,
            due_at: ev.expires_at,
          },
        });

        scheduledCount++;
        console.log(`[evidence-expiry-cron] Scheduled review for evidence ${ev.id}`);
      } catch (err: any) {
        console.error(`[evidence-expiry-cron] Error processing soon-due ${ev.id}:`, err);
      }
    }

    const result = {
      expired_processed: expiredCount,
      scheduled_processed: scheduledCount,
      window_days: WINDOW_SOON_DAYS,
      run_at: nowIso,
    };

    console.log('[evidence-expiry-cron] Completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[evidence-expiry-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: 'cron_failed',
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
