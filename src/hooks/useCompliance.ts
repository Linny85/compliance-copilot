import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VComplianceSummaryRow, VFrameworkComplianceRow, TrendData } from '@/lib/compliance/score';
import { getTenantId } from '@/lib/tenant';

export function useComplianceData() {
  const [summary, setSummary] = useState<VComplianceSummaryRow | null>(null);
  const [frameworks, setFrameworks] = useState<VFrameworkComplianceRow[]>([]);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    const { data: ov } = await supabase
      .from('v_compliance_overview' as any)
      .select('overall_pct, controls_pct, evidence_pct, trainings_pct, dpia_pct, dpia_total')
      .eq('tenant_id', tid)
      .maybeSingle() as any;

    // Load framework progress from normalized view (always has all frameworks)
    const { data: fwData } = await supabase
      .from('v_framework_progress' as any)
      .select('framework_code, score')
      .eq('tenant_id', tid) as any;

    const fwArr = Array.isArray(fwData) ? fwData : [];

    if (import.meta.env.DEV) console.debug('[progress:fw]', { frameworks: fwArr });

    if (ov) {
      setSummary({
        tenant_id: tid,
        // backend may return 0..1 or 0..100 → normalize to 0..1 here
        overall_score: Number(ov.overall_pct ?? 0) > 1 ? Number(ov.overall_pct)/100 : Number(ov.overall_pct ?? 0),
        controls_score: Number(ov.controls_pct ?? 0) > 1 ? Number(ov.controls_pct)/100 : Number(ov.controls_pct ?? 0),
        evidence_score: Number(ov.evidence_pct ?? 0) > 1 ? Number(ov.evidence_pct)/100 : Number(ov.evidence_pct ?? 0),
        training_score: Number(ov.trainings_pct ?? 0) > 1 ? Number(ov.trainings_pct)/100 : Number(ov.trainings_pct ?? 0),
        dpia_score: Number(ov.dpia_pct ?? 0) > 1 ? Number(ov.dpia_pct)/100 : Number(ov.dpia_pct ?? 0),
        dpia_total: Number(ov.dpia_total ?? 0),
      });
      // Accept a variety of shapes and keep original objects
      setFrameworks(Array.isArray(fwArr) ? fwArr : []);
        } else {
          setSummary({
            tenant_id: tid,
            overall_score: 0,
            controls_score: 0,
            evidence_score: 0,
            training_score: 0,
            dpia_score: 0,
            dpia_total: 0,
          });
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
    const raw = Number(f?.score ?? 0);
    if (!Number.isFinite(raw)) return 0;
    // View returns 0..1, convert to percentage
    return Math.round(raw * 100);
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
      const { data: ov } = await supabase
        .from('v_compliance_overview' as any)
        .select('overall_pct, controls_pct, evidence_pct, trainings_pct, dpia_pct, dpia_total')
        .eq('tenant_id', tenantId)
        .maybeSingle() as any;

      // Re-fetch framework progress
      const { data: fwData } = await supabase
        .from('v_framework_progress' as any)
        .select('framework_code, score')
        .eq('tenant_id', tenantId) as any;

      if (ov) {
        setSummary({
          tenant_id: tenantId,
          // backend may return 0..1 or 0..100 → normalize to 0..1 here
          overall_score: Number(ov.overall_pct ?? 0) > 1 ? Number(ov.overall_pct)/100 : Number(ov.overall_pct ?? 0),
          controls_score: Number(ov.controls_pct ?? 0) > 1 ? Number(ov.controls_pct)/100 : Number(ov.controls_pct ?? 0),
          evidence_score: Number(ov.evidence_pct ?? 0) > 1 ? Number(ov.evidence_pct)/100 : Number(ov.evidence_pct ?? 0),
          training_score: Number(ov.trainings_pct ?? 0) > 1 ? Number(ov.trainings_pct)/100 : Number(ov.trainings_pct ?? 0),
          dpia_score: Number(ov.dpia_pct ?? 0) > 1 ? Number(ov.dpia_pct)/100 : Number(ov.dpia_pct ?? 0),
          dpia_total: Number(ov.dpia_total ?? 0),
        });
        setFrameworks(Array.isArray(fwData) ? fwData : []);
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
