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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const targetTenantId = body.tenant_id;

    console.log('[generate-explainability] Starting batch processing', { targetTenantId });

    // Get tenants with explainability enabled
    let tenantQuery = supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('explainability_enabled', true);

    if (targetTenantId) {
      tenantQuery = tenantQuery.eq('tenant_id', targetTenantId);
    }

    const { data: tenantSettings, error: tenantError } = await tenantQuery;
    if (tenantError) throw tenantError;

    const tenantIds = (tenantSettings || []).map((t: any) => t.tenant_id);
    console.log(`[generate-explainability] Processing ${tenantIds.length} tenants`);

    let signalsWritten = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const tenant_id of tenantIds) {
      // Fallback: manual calculation
      // Calculate rule_group signals
      const { data: ruleGroups } = await supabase
        .from('check_results' as any)
        .select('details')
        .eq('tenant_id', tenant_id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      if (ruleGroups && ruleGroups.length >= 30) {
        const groupStats = new Map<string, { fails: number; total: number }>();
        let totalFails = 0;

        for (const result of ruleGroups) {
          const group = (result.details as any)?.rule_group || 'unknown';
          const isFail = (result as any).outcome === 'fail';
          
          if (!groupStats.has(group)) {
            groupStats.set(group, { fails: 0, total: 0 });
          }
          const stats = groupStats.get(group)!;
          stats.total++;
          if (isFail) {
            stats.fails++;
            totalFails++;
          }
        }

        // Write signals for rule_groups
        for (const [group, stats] of groupStats.entries()) {
          if (stats.total >= 30) {
            const failShare = totalFails > 0 ? stats.fails / totalFails : 0;
            
            await supabase.from('explainability_signals').insert({
              tenant_id,
              day: today,
              feature: 'rule_group',
              key: group,
              metric: 'fail_share',
              value: failShare,
              sample_size: stats.total,
              p_value: null
            });
            signalsWritten++;
          }
        }
      }

      // Calculate day-of-week correlation with SR
      const { data: dailyData } = await supabase
        .from('v_daily_sr_30d' as any)
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('day', { ascending: true });

      if (dailyData && dailyData.length >= 14) {
        const dowCounts = new Map<number, { sr: number[]; count: number }>();
        
        for (const row of dailyData) {
          const date = new Date(row.day);
          const dow = date.getDay(); // 0=Sun, 1=Mon, ...
          
          if (!dowCounts.has(dow)) {
            dowCounts.set(dow, { sr: [], count: 0 });
          }
          const stats = dowCounts.get(dow)!;
          stats.sr.push(row.sr || 0);
          stats.count++;
        }

        // Calculate average SR per day of week and compare to overall average
        const allSr = dailyData.map((r: any) => r.sr || 0);
        const overallAvg = allSr.reduce((a: number, b: number) => a + b, 0) / allSr.length;

        const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (const [dow, stats] of dowCounts.entries()) {
          if (stats.count >= 3) {
            const dowAvg = stats.sr.reduce((a, b) => a + b, 0) / stats.sr.length;
            const srDelta = dowAvg - overallAvg;
            
            await supabase.from('explainability_signals').insert({
              tenant_id,
              day: today,
              feature: 'dow',
              key: dowNames[dow],
              metric: 'sr_delta',
              value: srDelta,
              sample_size: stats.count,
              p_value: null
            });
            signalsWritten++;
          }
        }
      }

      // Create insight if significant signal found
      const { data: topSignals } = await supabase
        .from('v_explainability_top_30d' as any)
        .select('*')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (topSignals?.top_signals && topSignals.top_signals.length > 0) {
        const topSignal = topSignals.top_signals[0];
        const absValue = Math.abs(topSignal.value);
        
        if (absValue >= 0.2 && (!topSignal.p_value || topSignal.p_value <= 0.05)) {
          await supabase.from('insight_history' as any).insert({
            tenant_id,
            insight_type: 'explain',
            severity: 'info',
            title: `Erklärung: ${topSignal.feature} = ${topSignal.key}`,
            description: `Signifikanter Faktor gefunden: ${topSignal.metric} = ${topSignal.value.toFixed(4)} (n=${topSignal.sample})`,
            metadata: { signal: topSignal }
          });
        }
      }
    }

    console.log(`[generate-explainability] Complete. Processed ${tenantIds.length} tenants, wrote ${signalsWritten} signals`);

    return new Response(
      JSON.stringify({
        ok: true,
        tenants_processed: tenantIds.length,
        signals_written: signalsWritten
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[generate-explainability] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
