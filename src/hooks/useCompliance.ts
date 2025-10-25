import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VComplianceSummaryRow, VFrameworkComplianceRow } from '@/lib/compliance/score';

interface TrendData {
  cur_score: number;
  prev_score: number;
  delta_score: number;
}

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
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;
        setTenantId(profile.company_id);

        // Check admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_id', profile.company_id)
          .in('role', ['admin', 'master_admin'])
          .maybeSingle();

        setIsAdmin(!!roleData);

        // Load compliance summary (try materialized view first, fallback to regular view)
        const { data: s1, error: e1 } = await supabase
          .from('mv_compliance_summary' as any)
          .select('*')
          .eq('tenant_id', profile.company_id)
          .maybeSingle();

        if (s1 && !e1) {
          setSummary(s1 as unknown as VComplianceSummaryRow);
        } else {
          const { data: s2, error: summaryError } = await supabase
            .from('v_compliance_summary' as any)
            .select('*')
            .eq('tenant_id', profile.company_id)
            .maybeSingle();

          if (s2 && !summaryError) {
            setSummary(s2 as unknown as VComplianceSummaryRow);
          }
        }

        // Load framework scores from view
        const { data: f, error: frameworkError } = await supabase
          .from('v_framework_compliance' as any)
          .select('tenant_id, framework, score')
          .eq('tenant_id', profile.company_id);

        if (f && !frameworkError) {
          setFrameworks(f as unknown as VFrameworkComplianceRow[]);
        }

        // Load trend data
        const { data: t, error: trendError } = await supabase
          .from('v_control_compliance_trend' as any)
          .select('cur_score, prev_score, delta_score')
          .eq('tenant_id', profile.company_id)
          .maybeSingle();

        if (t && !trendError) {
          setTrend(t as unknown as TrendData);
        }
      } catch (error) {
        console.error('Error loading compliance data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getFrameworkScorePct = (fw: string) => {
    const m = frameworks.find(x => x.framework === fw);
    return Math.round(((m?.score ?? 0) * 100));
  };

  const refreshSummary = async () => {
    if (!tenantId) return;
    
    setRefreshing(true);
    try {
      const { error } = await (supabase.rpc as any)('refresh_compliance_summary_rpc');
      if (error) throw error;

      // Reload data after refresh
      const { data: s } = await supabase
        .from('mv_compliance_summary' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (s) {
        setSummary(s as unknown as VComplianceSummaryRow);
      }

      const { data: t } = await supabase
        .from('v_control_compliance_trend' as any)
        .select('cur_score, prev_score, delta_score')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (t) {
        setTrend(t as unknown as TrendData);
      }
    } catch (error) {
      console.error('Error refreshing compliance summary:', error);
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
    getFrameworkScorePct, 
    isAdmin,
    refreshSummary,
    refreshing
  };
}
