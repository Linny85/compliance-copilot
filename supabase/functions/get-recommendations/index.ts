import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));

    const { tenant_id, status = 'open', limit = 10, offset = 0 } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if recommendations are enabled
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('recommendations_enabled')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!settings?.recommendations_enabled) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          recommendations: [], 
          message: 'Recommendations disabled for this tenant' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommendations with playbook details
    const { data: recommendations, error } = await supabase
      .from('generated_recommendations')
      .select(`
        id,
        playbook_code,
        signal,
        weight,
        confidence,
        expected_impact,
        priority,
        status,
        snooze_until,
        created_at,
        playbook_catalog!inner(title, description, severity)
      `)
      .eq('tenant_id', tenant_id)
      .eq('status', status)
      .order('priority', { ascending: true })
      .order('expected_impact', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform to user-friendly format
    const transformed = (recommendations || []).map((rec: any) => ({
      id: rec.id,
      playbook_code: rec.playbook_code,
      title: rec.playbook_catalog.title,
      description: rec.playbook_catalog.description,
      severity: rec.playbook_catalog.severity,
      signal: rec.signal,
      weight: rec.weight,
      confidence: rec.confidence,
      expected_impact: rec.expected_impact,
      priority: rec.priority,
      status: rec.status,
      snooze_until: rec.snooze_until,
      created_at: rec.created_at
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        recommendations: transformed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[get-recommendations] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
