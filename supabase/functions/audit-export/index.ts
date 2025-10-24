import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { canonicalJSON, sha256Hex, signBundleHashEd25519 } from '../_shared/crypto.ts';

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

    const { from, to } = await req.json();

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: 'from and to timestamps are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    const tenant_id = profile.company_id;

    console.log(`[audit-export] Generating bundle for tenant ${tenant_id}, ${from} to ${to}`);

    // 1) Verify chain integrity first
    const { data: verification } = await supabaseClient.rpc('audit_verify_chain', {
      p_tenant: tenant_id,
      p_from: from,
      p_to: to,
    });

    const verifyResult = Array.isArray(verification) ? verification[0] : verification;
    const chain_ok = verifyResult?.ok || false;
    const first_break_at = verifyResult?.first_break_at || null;

    // 2) Fetch audit events
    const { data: events, error: eventsError } = await supabaseClient
      .from('audit_log')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('chain_order', { ascending: true });

    if (eventsError) {
      console.error('[audit-export] Failed to fetch events:', eventsError);
      throw eventsError;
    }

    // 3) Fetch evidence index (uploaded, reviewed, or expiring in time range)
    const { data: evidenceIndex, error: evidenceError } = await supabaseClient
      .from('v_evidence_index')
      .select('*')
      .eq('tenant_id', tenant_id)
      .or(`uploaded_at.gte.${from},uploaded_at.lte.${to},reviewed_at.gte.${from},reviewed_at.lte.${to},expires_at.gte.${from},expires_at.lte.${to}`)
      .order('uploaded_at', { ascending: true });

    if (evidenceError) {
      console.error('[audit-export] Failed to fetch evidence:', evidenceError);
      // Non-fatal, continue with empty array
    }

    // 4) Fetch deviations (created, updated, or valid in time range)
    const { data: deviations, error: deviationsError } = await supabaseClient
      .from('v_deviations_export')
      .select('*')
      .eq('tenant_id', tenant_id)
      .or(`created_at.gte.${from},created_at.lte.${to},updated_at.gte.${from},updated_at.lte.${to},valid_to.gte.${from},valid_to.lte.${to}`)
      .order('created_at', { ascending: true });

    if (deviationsError) {
      console.error('[audit-export] Failed to fetch deviations:', deviationsError);
      // Non-fatal, continue with empty array
    }

    // 5) Compute bundle hash from canonical JSON of all data
    const bundleData = {
      events: events || [],
      evidence_index: evidenceIndex || [],
      deviations: deviations || [],
    };
    
    const canonical = canonicalJSON(bundleData);
    const bundle_hash = await sha256Hex(canonical);

    // 6) Sign the bundle hash
    const signature = await signBundleHashEd25519(bundle_hash);

    // 7) Create complete bundle
    const bundle = {
      meta: {
        tenant_id,
        from,
        to,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        chain_ok,
        first_break_at,
        event_count: events?.length || 0,
        evidence_count: evidenceIndex?.length || 0,
        deviation_count: deviations?.length || 0,
        bundle_hash,
      },
      events: events || [],
      evidence_index: evidenceIndex || [],
      deviations: deviations || [],
      signature,
    };

    console.log(
      `[audit-export] Bundle generated: ${bundle.meta.event_count} events, ` +
      `${bundle.meta.evidence_count} evidence, ${bundle.meta.deviation_count} deviations, ` +
      `chain_ok=${chain_ok}`
    );

    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="audit-bundle-${tenant_id}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[audit-export] Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
