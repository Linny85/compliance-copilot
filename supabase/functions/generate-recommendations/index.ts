import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Condition {
  feature: string;
  key?: string;
  metric: string;
  operator: 'gt' | 'lt' | 'abs_gt' | 'in';
  threshold: number;
}

interface Playbook {
  code: string;
  title: string;
  description: string;
  condition: Condition;
  action_template: any;
  severity: string;
  default_impact: number;
}

function matchesCondition(signal: any, condition: Condition): boolean {
  // Feature match (can be pipe-separated alternatives)
  const features = condition.feature.split('|');
  if (!features.includes(signal.feature)) return false;

  // Key match if specified
  if (condition.key && signal.key !== condition.key) return false;

  // Metric match
  if (signal.metric !== condition.metric) return false;

  // Operator match
  const value = signal.value;
  const threshold = condition.threshold;

  switch (condition.operator) {
    case 'gt':
      return value > threshold;
    case 'lt':
      return value < threshold;
    case 'abs_gt':
      return Math.abs(value) > threshold;
    case 'in':
      return true; // simplified for now
    default:
      return false;
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

    const { tenant_id } = await req.json().catch(() => ({}));

    console.log('[generate-recommendations] Starting generation', { tenant_id });

    // Get tenants with recommendations enabled
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('recommendations_enabled', true);

    let tenantIds = (tenantSettings || []).map((t: any) => t.tenant_id);
    if (tenant_id) {
      tenantIds = tenantIds.filter((id: string) => id === tenant_id);
    }

    console.log(`[generate-recommendations] Processing ${tenantIds.length} tenants`);

    // Load playbook catalog
    const { data: playbooks } = await supabase
      .from('playbook_catalog')
      .select('*');

    if (!playbooks || playbooks.length === 0) {
      console.log('[generate-recommendations] No playbooks found');
      return new Response(
        JSON.stringify({ ok: true, tenants_processed: 0, recommendations_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recommendationsCreated = 0;
    const maxPerTenant = 10;

    for (const tid of tenantIds) {
      // Check how many open recommendations already exist
      const { data: existing } = await supabase
        .from('generated_recommendations')
        .select('id')
        .eq('tenant_id', tid)
        .eq('status', 'open');

      if (existing && existing.length >= maxPerTenant) {
        console.log(`[generate-recommendations] Tenant ${tid} already has ${existing.length} open recommendations, skipping`);
        continue;
      }

      // Get weighted signals
      const { data: weighted } = await supabase
        .from('v_explainability_top_weighted' as any)
        .select('*')
        .eq('tenant_id', tid)
        .maybeSingle();

      if (!weighted?.top_signals_weighted) continue;

      const signals = weighted.top_signals_weighted;

      for (const signal of signals) {
        // Only process signals with sufficient sample
        if (signal.sample < 5) continue;

        for (const pb of playbooks as Playbook[]) {
          if (matchesCondition(signal, pb.condition)) {
            // Calculate score
            const score = Math.abs(signal.value) * 
                         (signal.weight || 1) * 
                         (signal.confidence || 50) / 100 * 
                         (pb.default_impact || 3);

            const priority = score >= 6 ? 1 : score >= 3 ? 2 : 3;

            // Check if recommendation already exists (idempotent)
            const { data: dup } = await supabase
              .from('generated_recommendations')
              .select('id')
              .eq('tenant_id', tid)
              .eq('playbook_code', pb.code)
              .eq('status', 'open')
              .contains('signal', { feature: signal.feature, key: signal.key })
              .maybeSingle();

            if (dup) continue;

            // Insert recommendation
            const { error: insertError } = await supabase
              .from('generated_recommendations')
              .insert({
                tenant_id: tid,
                playbook_code: pb.code,
                signal: {
                  feature: signal.feature,
                  key: signal.key,
                  metric: signal.metric,
                  value: signal.value
                },
                weight: signal.weight || 1,
                confidence: signal.confidence || 50,
                expected_impact: score,
                priority: priority,
                status: 'open'
              });

            if (!insertError) {
              recommendationsCreated++;
              console.log(`[generate-recommendations] Created recommendation for tenant ${tid}: ${pb.code}`);
            } else {
              console.error('[generate-recommendations] Insert error:', insertError);
            }
          }
        }
      }
    }

    console.log(`[generate-recommendations] Complete. Created ${recommendationsCreated} recommendations`);

    return new Response(
      JSON.stringify({
        ok: true,
        tenants_processed: tenantIds.length,
        recommendations_created: recommendationsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[generate-recommendations] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
