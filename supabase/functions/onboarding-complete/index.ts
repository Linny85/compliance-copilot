import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await sb.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No company found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = profile.company_id;

    // Mark onboarding as complete
    await sb.from('Unternehmen').update({
      onboarding_done: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_progress: 100,
    }).eq('id', tenantId);

    // Audit log
    await logEvent(sb, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'onboarding.completed',
      entity: 'tenant',
      entity_id: tenantId,
      payload: {},
    });

    return new Response(JSON.stringify({ ok: true, message: 'Onboarding completed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[onboarding-complete]', error);
    return new Response(
      JSON.stringify({ error: 'complete_failed', details: String(error?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
