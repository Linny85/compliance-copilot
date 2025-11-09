import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * DEV-only Dashboard Debug Panel
 * Shows raw v_compliance_overview data for troubleshooting
 * 
 * Activate with: /dashboard?debug=1
 */
export function DashboardDebugPanel() {
  // Only render in DEV
  if (import.meta.env.PROD) return null;

  // Only show if ?debug=1 is present
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') return null;

  const [data, setData] = useState<{
    timestamp: string;
    companyId: string | null;
    overview: any;
    error?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData({
            timestamp: new Date().toISOString(),
            companyId: null,
            overview: null,
            error: 'No authenticated user'
          });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        const companyId = profile?.company_id || null;

        if (!companyId) {
          setData({
            timestamp: new Date().toISOString(),
            companyId: null,
            overview: null,
            error: 'No company_id in profile'
          });
          return;
        }

        const { data: overview, error } = await supabase
          .from('v_compliance_overview' as any)
          .select('*')
          .eq('tenant_id', companyId)
          .maybeSingle();

        setData({
          timestamp: new Date().toISOString(),
          companyId,
          overview: overview || null,
          error: error?.message
        });
      } catch (err) {
        setData({
          timestamp: new Date().toISOString(),
          companyId: null,
          overview: null,
          error: String(err)
        });
      }
    })();
  }, []);

  if (!data) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#1a1a1a',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        maxWidth: '400px',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}>
        Loading debug data...
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '11px',
      maxWidth: '500px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 9999,
      fontFamily: 'monospace',
      border: '1px solid #333'
    }}>
      <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '13px' }}>
        🐛 Dashboard Debug Panel
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Timestamp:</strong> {data.timestamp}
      </div>
      
      <div style={{ marginBottom: '8px' }} data-testid="dbg-company-id">
        <strong>Company ID:</strong> {data.companyId || 'null'}
      </div>

      {data.error && (
        <div style={{ marginBottom: '8px', color: '#ff6b6b' }}>
          <strong>Error:</strong> {data.error}
        </div>
      )}

      <div style={{ marginBottom: '8px' }} data-testid="dbg-overview-json">
        <strong>Raw v_compliance_overview:</strong>
        <pre style={{ 
          marginTop: '4px', 
          padding: '8px', 
          background: '#2a2a2a',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(data.overview, null, 2) || 'null'}
        </pre>
      </div>

      {data.overview && (
        <div>
          <strong>Derived Percentages:</strong>
          <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div data-testid="dbg-overall">Overall: {data.overview.overall_pct ?? 'null'}%</div>
            <div data-testid="dbg-controls">Controls: {data.overview.controls_pct ?? 'null'}%</div>
            <div data-testid="dbg-nis2">NIS2: {data.overview.nis2_pct ?? 'null'}%</div>
            <div data-testid="dbg-ai">AI Act: {data.overview.ai_act_pct ?? 'null'}%</div>
            <div data-testid="dbg-dsgvo">GDPR: {data.overview.dsgvo_pct ?? 'null'}%</div>
            <div data-testid="dbg-evidence">Evidence: {data.overview.evidence_pct ?? 'null'}%</div>
            <div data-testid="dbg-training">Training: {data.overview.trainings_pct ?? 'null'}%</div>
            <div data-testid="dbg-dpia">DPIA: {data.overview.dpia_pct ?? 'null'}%</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '10px', opacity: 0.6 }}>
        Remove ?debug=1 from URL to hide this panel
      </div>
    </div>
  );
}
