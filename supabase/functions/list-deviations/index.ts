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

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');
    const control_id = url.searchParams.get('control_id');
    const overdue_only = url.searchParams.get('overdue_only') === 'true';
    const recert_due_only = url.searchParams.get('recert_due_only') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get tenant_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Failed to determine tenant' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let query = supabaseClient
      .from('deviations')
      .select('*, controls(code, title)', { count: 'exact' })
      .eq('tenant_id', profile.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (control_id) {
      query = query.eq('control_id', control_id);
    }

    if (overdue_only) {
      query = query
        .lt('sla_due_at', new Date().toISOString())
        .in('status', ['draft', 'in_review']);
    }

    if (recert_due_only) {
      query = query
        .lte('recert_at', new Date().toISOString())
        .eq('status', 'active');
    }

    const { data: deviations, error: queryError, count } = await query;

    if (queryError) {
      console.error('[list-deviations] Query failed:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch deviations', details: queryError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[list-deviations] Returned ${deviations?.length || 0} deviations`);

    return new Response(
      JSON.stringify({
        deviations: deviations || [],
        total: count || 0,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[list-deviations] Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
