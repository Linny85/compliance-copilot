import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

// Canonical JSON serialization for bundle hash
function canonicalJSON(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalJSON(obj[k])}`).join(',') + '}';
}

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

    // Verify chain first
    const { data: verification } = await supabaseClient.rpc('audit_verify_chain', {
      p_tenant: tenant_id,
      p_from: from,
      p_to: to,
    });

    const verifyResult = Array.isArray(verification) ? verification[0] : verification;
    const chain_ok = verifyResult?.ok || false;

    // Fetch audit events
    const { data: events, error: fetchError } = await supabaseClient
      .from('audit_log')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('chain_order', { ascending: true });

    if (fetchError) {
      console.error('[audit-export] Fetch failed:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events', details: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Compute bundle hash
    const eventsCanonical = canonicalJSON(events || []);
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(eventsCanonical));
    const bundle_hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create bundle
    const bundle = {
      meta: {
        tenant_id,
        from,
        to,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        chain_ok,
        first_break_at: verifyResult?.first_break_at || null,
        event_count: events?.length || 0,
        bundle_hash,
      },
      events: events || [],
      signature: {
        alg: 'SHA-256',
        note: 'Bundle integrity hash - full signature requires AUDIT_SIGN_PRIV_BASE64',
      },
    };

    // Optional: Sign bundle if signing key is configured
    const signKey = Deno.env.get('AUDIT_SIGN_PRIV_BASE64');
    if (signKey) {
      try {
        // Ed25519 signing would go here
        // For now, just indicate signature capability
        bundle.signature = {
          alg: 'Ed25519',
          note: 'Signing not yet implemented - placeholder',
        };
      } catch (signError) {
        console.warn('[audit-export] Signing failed:', signError);
      }
    }

    console.log(`[audit-export] Exported ${events?.length || 0} events, chain_ok=${chain_ok}`);

    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="audit-export-${tenant_id}-${Date.now()}.json"`,
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
