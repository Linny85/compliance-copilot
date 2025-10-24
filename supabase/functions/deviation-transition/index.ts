import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['active'],
  active: ['expired', 'closed'],
  rejected: [],
  expired: [],
  closed: [],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { deviation_id, target_status, comment } = await req.json();

    if (!deviation_id || !target_status) {
      return new Response(
        JSON.stringify({ error: 'deviation_id and target_status are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get current deviation
    const { data: deviation, error: fetchError } = await supabaseClient
      .from('deviations')
      .select('*')
      .eq('id', deviation_id)
      .single();

    if (fetchError || !deviation) {
      return new Response(
        JSON.stringify({ error: 'Deviation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const current_status = deviation.status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[current_status] || [];
    if (!allowed.includes(target_status)) {
      return new Response(
        JSON.stringify({
          error: `Invalid transition from ${current_status} to ${target_status}`,
          allowed_transitions: allowed,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Role separation check
    if (target_status === 'in_review' && deviation.requested_by === user.id) {
      // Requester cannot review their own deviation
      return new Response(
        JSON.stringify({ error: 'Maker-Checker violation: requester cannot review' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (
      (target_status === 'approved' || target_status === 'rejected') &&
      (deviation.requested_by === user.id || deviation.reviewer_id === user.id)
    ) {
      // Approver must be different from requester and reviewer
      return new Response(
        JSON.stringify({
          error: 'Maker-Checker violation: approver must differ from requester and reviewer',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare update payload
    const updates: any = { status: target_status };

    if (target_status === 'in_review') {
      updates.reviewer_id = user.id;
    }

    if (target_status === 'approved' || target_status === 'rejected') {
      updates.approver_id = user.id;
    }

    if (target_status === 'active') {
      updates.valid_from = new Date().toISOString();
    }

    // Update deviation
    const { data: updated, error: updateError } = await supabaseClient
      .from('deviations')
      .update(updates)
      .eq('id', deviation_id)
      .select()
      .single();

    if (updateError) {
      console.error('[deviation-transition] Update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to transition', details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Audit log
    await logEvent(supabaseClient, {
      tenant_id: deviation.tenant_id,
      actor_id: user.id,
      action: 'deviation.transition',
      entity: 'deviation',
      entity_id: deviation_id,
      payload: {
        from: current_status,
        to: target_status,
        comment,
      },
    });

    console.log(
      `[deviation-transition] Transitioned ${deviation_id}: ${current_status} → ${target_status}`
    );

    return new Response(JSON.stringify({ deviation: updated }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[deviation-transition] Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
