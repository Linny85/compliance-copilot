import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface OutboxJob {
  id: string;
  tenant_id: string;
  channel: 'slack' | 'jira' | 'webhook';
  event_type: string;
  payload: any;
  attempts: number;
}

function calculateBackoff(attempt: number): number {
  const base = Math.pow(2, Math.min(attempt, 6)); // max 64x
  const jitter = Math.floor(Math.random() * 1000); // 0-1s
  return base * 1000 + jitter; // in ms
}

async function dispatchSlack(webhookUrl: string, payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.message || payload.text,
        blocks: payload.blocks,
        attachments: payload.attachments
      })
    });

    if (response.status === 429) {
      return { success: false, error: 'Rate limited' };
    }

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Slack error ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function dispatchJira(baseUrl: string, projectKey: string, auth: string, payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: payload.title || payload.summary,
          description: payload.description,
          issuetype: { name: payload.issue_type || 'Task' },
          labels: payload.labels || []
        }
      })
    });

    if (response.status === 429) {
      return { success: false, error: 'Rate limited' };
    }

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Jira error ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[integration-dispatcher] Starting dispatch cycle');

    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('integration_outbox')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .limit(50);

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      console.log('[integration-dispatcher] No pending jobs');
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[integration-dispatcher] Processing ${jobs.length} jobs`);

    let successCount = 0;
    let failCount = 0;
    let deadCount = 0;

    for (const job of jobs as OutboxJob[]) {
      console.log(`[integration-dispatcher] Processing job ${job.id}, channel: ${job.channel}, attempt: ${job.attempts + 1}`);

      // Get tenant settings
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', job.tenant_id)
        .maybeSingle();

      if (!settings) {
        console.log(`[integration-dispatcher] No settings for tenant ${job.tenant_id}`);
        continue;
      }

      let result: { success: boolean; error?: string } = { success: false, error: 'Unknown channel' };

      if (job.channel === 'slack' && settings.integration_slack_enabled && settings.integration_slack_webhook_url) {
        result = await dispatchSlack(settings.integration_slack_webhook_url, job.payload);
      } else if (job.channel === 'jira' && settings.integration_jira_enabled && settings.integration_jira_base_url) {
        const jiraAuth = Deno.env.get('INTEGRATION_JIRA_AUTH') || '';
        result = await dispatchJira(
          settings.integration_jira_base_url,
          settings.integration_jira_project_key || 'COMP',
          jiraAuth,
          job.payload
        );
      }

      if (result.success) {
        // Mark as delivered
        await supabase
          .from('integration_outbox')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', job.id);
        successCount++;
        console.log(`[integration-dispatcher] Job ${job.id} delivered`);
      } else {
        const newAttempts = job.attempts + 1;
        const maxAttempts = 10;

        if (newAttempts >= maxAttempts || result.error?.includes('4')) {
          // Move to DLQ
          await supabase.from('integration_dlq').insert({
            id: job.id,
            tenant_id: job.tenant_id,
            channel: job.channel,
            event_type: job.event_type,
            payload: job.payload,
            dedupe_key: null,
            attempts: newAttempts,
            last_error: result.error,
            created_at: new Date().toISOString()
          });

          await supabase
            .from('integration_outbox')
            .update({ status: 'dead', last_error: result.error })
            .eq('id', job.id);

          deadCount++;
          console.log(`[integration-dispatcher] Job ${job.id} moved to DLQ: ${result.error}`);
        } else {
          // Retry with backoff
          const backoffMs = calculateBackoff(newAttempts);
          const nextAttempt = new Date(Date.now() + backoffMs);

          await supabase
            .from('integration_outbox')
            .update({
              status: 'failed',
              attempts: newAttempts,
              next_attempt_at: nextAttempt.toISOString(),
              last_error: result.error
            })
            .eq('id', job.id);

          failCount++;
          console.log(`[integration-dispatcher] Job ${job.id} failed, retry in ${backoffMs}ms: ${result.error}`);
        }
      }
    }

    console.log(`[integration-dispatcher] Complete: ${successCount} success, ${failCount} failed, ${deadCount} dead`);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: jobs.length,
        success: successCount,
        failed: failCount,
        dead: deadCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[integration-dispatcher] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
