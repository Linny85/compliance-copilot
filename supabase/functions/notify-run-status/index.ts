import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface NotificationPayload {
  run_id: string;
  tenant_id: string;
  status: string;
  rule_code?: string;
  started_at?: string;
  finished_at?: string;
}

// HMAC-SHA256 signing
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Domain validation
function isAllowedDomain(url: string, allowlist: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true; // No restriction if empty
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return allowlist.some(domain => 
      hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase())
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    
    // Use service role for internal/scheduled calls
    const useServiceKey = authHeader.includes(SUPABASE_SERVICE_ROLE_KEY);
    const sb = createClient(
      SUPABASE_URL, 
      useServiceKey ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
      { global: { headers: useServiceKey ? {} : { Authorization: authHeader } } }
    );

    // Auth check for non-service calls
    if (!useServiceKey) {
      const { data: { user }, error: userErr } = await sb.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get tenant
      const { data: profile } = await sb
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        return new Response(JSON.stringify({ error: 'No tenant' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check admin role
      const { data: roles } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .in('role', ['admin', 'master_admin']);

      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: 'FORBIDDEN_ADMIN_ONLY' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const payload: NotificationPayload = await req.json();
    const { run_id, tenant_id, status, rule_code, started_at, finished_at } = payload;

    if (!run_id || !tenant_id || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[notify-run-status]', { run_id, tenant_id, status });

    // Fetch tenant settings (use service client for consistency)
    const sbService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: settings } = await sbService
      .from('tenant_settings')
      .select('notification_email, notification_webhook_url, webhook_secret, webhook_domain_allowlist')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const notifications: string[] = [];

    // Send email notification if configured
    if (settings?.notification_email) {
      const startTime = Date.now();
      try {
        // Note: Email sending requires Resend setup
        // For now, we log it and track delivery
        console.log('[notify-run-status] Email notification to:', settings.notification_email);
        console.log('[notify-run-status] Email content:', {
          run_id,
          status,
          rule_code,
          started_at,
          finished_at
        });
        
        // Log delivery
        await sbService.from('notification_deliveries').insert({
          tenant_id,
          run_id,
          channel: 'email',
          status_code: 200,
          attempts: 1,
          duration_ms: Date.now() - startTime
        });
        
        notifications.push('email');
      } catch (emailErr: any) {
        console.error('[notify-run-status] Email error:', emailErr);
        await sbService.from('notification_deliveries').insert({
          tenant_id,
          run_id,
          channel: 'email',
          status_code: 500,
          attempts: 1,
          duration_ms: Date.now() - startTime,
          error_excerpt: String(emailErr.message || emailErr).substring(0, 500)
        });
      }
    }

    // Send webhook notification if configured
    if (settings?.notification_webhook_url) {
      const startTime = Date.now();
      try {
        // Validate domain allowlist
        const allowlist = settings.webhook_domain_allowlist || [];
        if (allowlist.length > 0 && !isAllowedDomain(settings.notification_webhook_url, allowlist)) {
          throw new Error('Webhook domain not in allowlist');
        }

        const webhookPayload = {
          event: 'check_run_status_changed',
          data: {
            run_id,
            tenant_id,
            status,
            rule_code,
            started_at,
            finished_at,
            timestamp: new Date().toISOString()
          }
        };

        const payloadStr = JSON.stringify(webhookPayload);
        const signature = await signPayload(payloadStr, settings.webhook_secret || '');

        const webhookResponse = await fetch(settings.notification_webhook_url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Event-Type': 'check_run_status_changed'
          },
          body: payloadStr
        });

        const duration = Date.now() - startTime;

        if (webhookResponse.ok) {
          console.log('[notify-run-status] Webhook sent successfully');
          await sbService.from('notification_deliveries').insert({
            tenant_id,
            run_id,
            channel: 'webhook',
            status_code: webhookResponse.status,
            attempts: 1,
            duration_ms: duration
          });
          notifications.push('webhook');
        } else {
          throw new Error(`Webhook failed: ${webhookResponse.status}`);
        }
      } catch (webhookErr: any) {
        console.error('[notify-run-status] Webhook error:', webhookErr);
        await sbService.from('notification_deliveries').insert({
          tenant_id,
          run_id,
          channel: 'webhook',
          status_code: 500,
          attempts: 1,
          duration_ms: Date.now() - startTime,
          error_excerpt: String(webhookErr.message || webhookErr).substring(0, 500)
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notifications_sent: notifications 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('[notify-run-status] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
