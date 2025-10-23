import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type OpsRow = {
  tenant_id: string;
  mtta_ms: number;
  mttr_ms: number;
  open_critical: number;
  open_warning: number;
  last_24h_alerts: number;
  success_rate_30d: number;
  wow_delta_30d: number;
  traffic_light: 'green' | 'yellow' | 'red';
  updated_at: string;
};

export function OpsDashboardCard({ companyId }: { companyId: string }) {
  const [row, setRow] = useState<OpsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ops_dashboard' as any)
        .select('*')
        .eq('tenant_id', companyId)
        .maybeSingle();
      if (error) throw error;
      setRow(data ? data as unknown as OpsRow : null);
    } catch (e: any) {
      console.error('[OpsDashboardCard] load error:', e);
      setRow(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) load();
  }, [companyId]);

  const sendDigest = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-ops-digest', {
        body: { tenant_id: companyId },
      });
      if (error) throw error;
      toast({
        title: 'Digest sent',
        description: 'Check your inbox.',
      });
    } catch (e: any) {
      toast({
        title: 'Failed to send digest',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const lightEmoji =
    row?.traffic_light === 'red'
      ? '🔴'
      : row?.traffic_light === 'yellow'
      ? '🟡'
      : '🟢';

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold">Operations</h3>
        <div className="mt-4 animate-pulse h-16 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Operations</h3>
          <p className="text-sm text-muted-foreground">
            Unified compliance operations status
          </p>
        </div>
        <Button variant="secondary" onClick={sendDigest} disabled={sending}>
          {sending ? 'Sending…' : 'Send Ops Digest'}
        </Button>
      </div>

      {!row ? (
        <div className="mt-6 text-sm text-muted-foreground">
          No data yet. This populates after the scheduled refresh.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">Traffic Light</div>
              <div className="mt-1 text-2xl">
                {lightEmoji} {row.traffic_light.toUpperCase()}
              </div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">
                Success Rate (30d)
              </div>
              <div className="mt-1 text-2xl">{row.success_rate_30d}%</div>
              <div
                className={`text-xs ${
                  row.wow_delta_30d >= 0
                    ? 'text-green-600'
                    : 'text-destructive'
                }`}
              >
                {row.wow_delta_30d >= 0 ? '+' : ''}
                {row.wow_delta_30d}% WoW
              </div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">MTTA / MTTR</div>
              <div className="mt-1 text-2xl">
                {Math.round(row.mtta_ms / 1000)}s /{' '}
                {Math.round(row.mttr_ms / 1000)}s
              </div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-muted-foreground">Open Alerts</div>
              <div className="mt-1 text-2xl">
                🔴 {row.open_critical} &nbsp; 🟡 {row.open_warning}
              </div>
              <div className="text-xs text-muted-foreground">
                Last 24h: {row.last_24h_alerts}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Last updated: {new Date(row.updated_at).toLocaleString()}
          </div>
        </>
      )}
    </Card>
  );
}
