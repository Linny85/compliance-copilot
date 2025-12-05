import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VComplianceSummaryRow, VFrameworkComplianceRow, TrendData } from '@/lib/compliance/score';
import { getTenantId } from '@/lib/tenant';
import { toPct as pctHelper, toUnit as unitHelper, clampPct as clampPctHelper } from '@/lib/compliance/helpers';

export const toUnit = unitHelper;
export const toPct = pctHelper;
export const clampPct = clampPctHelper;

export function useComplianceData() {
  const [summary, setSummary] = useState<VComplianceSummaryRow | null>(null);
  const [frameworks, setFrameworks] = useState<VFrameworkComplianceRow[]>([]);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Keep last valid state to prevent 0-flicker during reload
  const lastSummaryRef = useRef<VComplianceSummaryRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const tid = await getTenantId();
        if (!tid) {
          setLoading(false);
          return;
        }
        
        setTenantId(tid);

        // Check admin role (user_roles table uses company_id as FK)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_id', tid)
          .in('role', ['admin', 'master_admin'])
          .maybeSingle();

        setIsAdmin(!!roleData);

    // Load from v_compliance_overview (returns 0..100 percentages)
    const { data: ov, error: ovError } = await supabase
      .from('v_compliance_overview' as any)
      .select('overall_pct, controls_pct, evidence_pct, trainings_pct, dpia_pct, dpia_total, frameworks')
      .eq('tenant_id', tid)
      .maybeSingle() as any;

    if (ovError) {
      console.error('[useComplianceData] query error:', ovError);
      // Keep last valid state on error
      if (lastSummaryRef.current) {
        setSummary(lastSummaryRef.current);
      }
    } else {
      // Extract framework scores from JSON array
      const fwArr = Array.isArray(ov?.frameworks) ? ov.frameworks : [];
      const f = (code: string) => fwArr.find((x: any) => x.framework_code === code)?.score ?? null;

      if (import.meta.env.DEV) console.debug('[compliance:data]', { ov, frameworks: fwArr });

      const normalized: VComplianceSummaryRow = {
        tenant_id: tid,
        overall_score: toUnit(ov?.overall_pct),
        controls_score: toUnit(ov?.controls_pct),
        evidence_score: toUnit(ov?.evidence_pct),
        training_score: toUnit(ov?.trainings_pct),
        dpia_score: toUnit(ov?.dpia_pct),
        dpia_total: Number(ov?.dpia_total ?? 0),
        nis2: toUnit(f('NIS2')),
        aiAct: toUnit(f('AI_ACT')),
        gdpr: toUnit(f('GDPR')),
      };

      lastSummaryRef.current = normalized;
      setSummary(normalized);

      setFrameworks(fwArr.map((x: any) => ({
        framework_code: x.framework_code,
        score: toUnit(x.score),
      })));
    }

        // Load trend data - only if there's actual data
        const { data: t } = await supabase
          .from('v_control_compliance_trend' as any)
          .select('cur_score, prev_score, delta_score')
          .eq('tenant_id', tid)
          .maybeSingle();

        // Only set trend if we have meaningful data (not 0 -> 0)
        const trendData = t as unknown as TrendData | null;
        if (trendData && ((trendData.cur_score ?? 0) > 0 || (trendData.prev_score ?? 0) > 0)) {
          setTrend(trendData);
        } else {
          setTrend(null);
        }
      } catch (error) {
        console.error('Error loading compliance data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getFrameworkScorePct = (fw: string) => {
    if (!Array.isArray(frameworks)) return 0;
    const f = frameworks.find((x: any) =>
      String(x?.framework_code ?? x?.code ?? '')
        .toUpperCase() === fw.toUpperCase()
    );
    return toPct(f?.score ?? 0);
  };

  const getDpiaTotal = (): number => {
    // Count total DPIA cases from summary metadata if available
    // This will be 0 until we have actual DPIA records
    return summary?.dpia_total ?? 0;
  };

  const refreshSummary = async () => {
    if (!tenantId) return;

    try {
      setRefreshing(true);

      // Re-fetch from v_compliance_overview
      const { data: ov, error: ovError } = await supabase
        .from('v_compliance_overview' as any)
        .select('overall_pct, controls_pct, evidence_pct, trainings_pct, dpia_pct, dpia_total, frameworks')
        .eq('tenant_id', tenantId)
        .maybeSingle() as any;

      if (ovError) {
        console.error('[refreshSummary] query error:', ovError);
        // Keep last valid state
        if (lastSummaryRef.current) {
          setSummary(lastSummaryRef.current);
        }
      } else {
        // Extract framework scores from JSON array
        const fwArr = Array.isArray(ov?.frameworks) ? ov.frameworks : [];
        const f = (code: string) => fwArr.find((x: any) => x.framework_code === code)?.score ?? null;

        const normalized: VComplianceSummaryRow = {
          tenant_id: tenantId,
          overall_score: toUnit(ov?.overall_pct),
          controls_score: toUnit(ov?.controls_pct),
          evidence_score: toUnit(ov?.evidence_pct),
          training_score: toUnit(ov?.trainings_pct),
          dpia_score: toUnit(ov?.dpia_pct),
          dpia_total: Number(ov?.dpia_total ?? 0),
          nis2: toUnit(f('NIS2')),
          aiAct: toUnit(f('AI_ACT')),
          gdpr: toUnit(f('GDPR')),
        };

        lastSummaryRef.current = normalized;
        setSummary(normalized);

        setFrameworks(fwArr.map((x: any) => ({
          framework_code: x.framework_code,
          score: toUnit(x.score),
        })));
      }

      // Re-fetch trend
      const { data: trendData } = await supabase
        .from('v_control_compliance_trend')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (trendData) {
        setTrend({
          cur_score: trendData.cur_score,
          prev_score: trendData.prev_score,
          delta_score: trendData.delta_score
        });
      }
    } catch (error) {
      console.error('Error refreshing compliance data:', error);
      throw error;
    } finally {
      setRefreshing(false);
    }
  };

  return {
    loading,
    summary,
    frameworks,
    trend,
    tenantId,
    isAdmin,
    refreshSummary,
    refreshing
  };
}
