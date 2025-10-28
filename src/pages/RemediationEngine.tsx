import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle } from 'lucide-react';

type RemediationRun = {
  id: string;
  tenant_id: string;
  playbook_code: string;
  playbook_title: string;
  playbook_description: string;
  severity: string;
  auto_triggered: boolean;
  status: string;
  started_at: string;
  completed_at: string | null;
  impact: number | null;
  confidence_before: number | null;
  confidence_after: number | null;
  result: any;
  initiated_by_email: string | null;
};

export default function RemediationEngine() {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<RemediationRun[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        navigate('/onboarding');
        return;
      }

      setCompanyId(profile.company_id);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load runs
      const { data: runsData, error: runsError } = await supabase
        .from('v_remediation_history' as any)
        .select('*')
        .eq('tenant_id', companyId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (runsError) throw runsError;
      setRuns((runsData as any) || []);

      // Load stats
      const { data: statsData } = await supabase
        .from('v_remediation_recent' as any)
        .select('*')
        .eq('tenant_id', companyId);

      if (statsData && statsData.length > 0) {
        const aggregated = {
          total_success: statsData.reduce((sum: number, s: any) => sum + (s.success_count || 0), 0),
          total_failed: statsData.reduce((sum: number, s: any) => sum + (s.fail_count || 0), 0),
          total_rollback: statsData.reduce((sum: number, s: any) => sum + (s.rollback_count || 0), 0),
          avg_impact: statsData.reduce((sum: number, s: any) => sum + (s.avg_impact || 0), 0) / statsData.length
        };
        setStats(aggregated);
      }
    } catch (error) {
      console.error('[RemediationEngine] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (runId: string) => {
    try {
      const { error } = await supabase.functions.invoke('execute-remediation', {
        body: { run_id: runId, action: 'rollback' }
      });

      if (error) throw error;

      toast({
        title: 'Rollback initiiert',
        description: 'Die Maßnahme wird rückgängig gemacht.',
      });

      loadData();
    } catch (err: any) {
      toast({
        title: 'Rollback fehlgeschlagen',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'executing':
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rolled_back':
        return <RotateCcw className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      success: 'default',
      failed: 'destructive',
      executing: 'secondary',
      pending: 'outline',
      rolled_back: 'outline'
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSeverityEmoji = (severity: string) => {
    return {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[severity] || '⚪';
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="animate-pulse">
              <div className="h-8 w-64 bg-muted rounded mb-4" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">🧩 Remediation Engine</h1>
            <p className="text-muted-foreground">
              Automatische und manuelle Compliance-Maßnahmen mit Closed-Loop Feedback
            </p>
          </div>

          {stats && (
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Erfolgreich</div>
                <div className="text-2xl font-bold text-green-600">{stats.total_success}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Fehlgeschlagen</div>
                <div className="text-2xl font-bold text-red-600">{stats.total_failed}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Rollback</div>
                <div className="text-2xl font-bold text-gray-600">{stats.total_rollback}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Ø Impact</div>
                <div className="text-2xl font-bold">
                  {stats.avg_impact > 0 ? '+' : ''}{stats.avg_impact.toFixed(1)}%
                </div>
              </Card>
            </div>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Remediation History</h2>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Maßnahmen ausgeführt</p>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <div key={run.id} className="p-4 border rounded bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        <span className="text-sm font-medium">{getSeverityEmoji(run.severity)} {run.playbook_title}</span>
                        {getStatusBadge(run.status)}
                        {run.auto_triggered && (
                          <Badge variant="outline" className="text-xs">AUTO</Badge>
                        )}
                      </div>
                      {run.status === 'success' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRollback(run.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{run.playbook_description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Started: {new Date(run.started_at).toLocaleString()}</span>
                      {run.completed_at && (
                        <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>
                      )}
                      {run.impact !== null && (
                        <span className={run.impact > 0 ? 'text-green-600' : 'text-red-600'}>
                          Impact: {run.impact > 0 ? '+' : ''}{run.impact.toFixed(2)}%
                        </span>
                      )}
                      {run.confidence_before !== null && run.confidence_after !== null && (
                        <span>
                          Confidence: {run.confidence_before.toFixed(0)}% → {run.confidence_after.toFixed(0)}%
                        </span>
                      )}
                      {run.initiated_by_email && (
                        <span>By: {run.initiated_by_email}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}
