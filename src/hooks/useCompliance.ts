import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VComplianceSummaryRow, VFrameworkComplianceRow } from '@/lib/compliance/score';

export function useComplianceData() {
  const [summary, setSummary] = useState<VComplianceSummaryRow | null>(null);
  const [frameworks, setFrameworks] = useState<VFrameworkComplianceRow[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        // Load compliance summary from view
        const { data: s, error: summaryError } = await supabase
          .from('v_compliance_summary' as any)
          .select('*')
          .eq('tenant_id', profile.company_id)
          .maybeSingle();

        if (s && !summaryError) {
          setSummary(s as unknown as VComplianceSummaryRow);
        }

        // Load framework scores from view
        const { data: f, error: frameworkError } = await supabase
          .from('v_framework_compliance' as any)
          .select('tenant_id, framework, score')
          .eq('tenant_id', profile.company_id);

        if (f && !frameworkError) {
          setFrameworks(f as unknown as VFrameworkComplianceRow[]);
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

  return { loading, summary, frameworks, tenantId, getFrameworkScorePct };
}
