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
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenant_id = profile.company_id;
    const body = await req.json();
    const { record_id } = body;

    if (!record_id) {
      return new Response(JSON.stringify({ error: 'record_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load record
    const { data: record, error: recordError } = await supabaseClient
      .from('v_dpia_overview')
      .select('*')
      .eq('id', record_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (recordError || !record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load answers with questions
    const { data: answers } = await supabaseClient
      .from('v_dpia_answers_export')
      .select('*')
      .eq('record_id', record_id);

    const bundle = {
      record,
      answers: answers || [],
      meta: {
        tenant_id,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      },
    };

    const canonical = canonicalJSON(bundle);
    const bundleHash = await sha256Hex(canonical);
    const signature = await signBundleHashEd25519(bundleHash);

    const exportData = {
      ...bundle,
      signature: {
        ...signature,
        bundle_hash: bundleHash,
      },
    };

    const filename = `dpia-bundle-${record_id}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[dpia-export] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
