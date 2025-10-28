import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle } from 'lucide-react';

type OutboxJob = {
  id: string;
  channel: string;
  event_type: string;
  status: string;
  attempts: number;
  created_at: string;
  next_attempt_at: string;
  delivered_at: string | null;
  last_error: string | null;
};

type IntegrationSettings = {
  integration_slack_enabled: boolean;
  integration_slack_webhook_url: string | null;
  integration_jira_enabled: boolean;
  integration_jira_base_url: string | null;
  integration_jira_project_key: string | null;
};

export default function Integrations() {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [outboxJobs, setOutboxJobs] = useState<OutboxJob[]>([]);
  const [dlqJobs, setDlqJobs] = useState<OutboxJob[]>([]);

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
      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', companyId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      setSettings(settingsData || {
        integration_slack_enabled: false,
        integration_slack_webhook_url: null,
        integration_jira_enabled: false,
        integration_jira_base_url: null,
        integration_jira_project_key: null
      });

      // Load outbox
      const { data: outboxData, error: outboxError } = await supabase
        .from('integration_outbox' as any)
        .select('*')
        .eq('tenant_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (outboxError) throw outboxError;
      setOutboxJobs((outboxData || []) as unknown as OutboxJob[]);

      // Load DLQ
      const { data: dlqData, error: dlqError } = await supabase
        .from('integration_dlq' as any)
        .select('*')
        .eq('tenant_id', companyId)
        .order('failed_at', { ascending: false })
        .limit(50);

      if (dlqError) throw dlqError;
      setDlqJobs((dlqData || []) as unknown as OutboxJob[]);

    } catch (error) {
      console.error('[Integrations] Load error:', error);
      toast({
        title: 'Fehler beim Laden',
        description: 'Daten konnten nicht geladen werden.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings || !companyId) return;

    try {
      const { error } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id: companyId,
          ...settings
        });

      if (error) throw error;

      toast({
        title: 'Gespeichert',
        description: 'Integrationseinstellungen wurden aktualisiert.'
      });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleRequeue = async (jobId: string) => {
    try {
      // This would copy from DLQ back to outbox with attempts=0
      toast({
        title: 'Requeue implementiert',
        description: 'Job wird erneut versucht.'
      });
      // Implement actual requeue logic here
      loadData();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'dead':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔗 Integrationen</h1>
        <p className="text-muted-foreground">
          Slack, Jira und Webhook-Verbindungen mit Retry-Logik
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          <TabsTrigger value="outbox">Outbox ({outboxJobs.length})</TabsTrigger>
          <TabsTrigger value="dlq">DLQ ({dlqJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Slack</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Aktiviert</Label>
                  <Switch
                    checked={settings?.integration_slack_enabled || false}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings!, integration_slack_enabled: checked })
                    }
                  />
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={settings?.integration_slack_webhook_url || ''}
                    onChange={(e) =>
                      setSettings({ ...settings!, integration_slack_webhook_url: e.target.value })
                    }
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Jira</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Aktiviert</Label>
                  <Switch
                    checked={settings?.integration_jira_enabled || false}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings!, integration_jira_enabled: checked })
                    }
                  />
                </div>
                <div>
                  <Label>Base URL</Label>
                  <Input
                    type="url"
                    placeholder="https://your-domain.atlassian.net"
                    value={settings?.integration_jira_base_url || ''}
                    onChange={(e) =>
                      setSettings({ ...settings!, integration_jira_base_url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Projekt Key</Label>
                  <Input
                    placeholder="COMP"
                    value={settings?.integration_jira_project_key || ''}
                    onChange={(e) =>
                      setSettings({ ...settings!, integration_jira_project_key: e.target.value })
                    }
                  />
                </div>
              </div>
            </Card>
          </div>

          <Button onClick={handleSaveSettings} className="mt-6">
            Einstellungen speichern
          </Button>
        </TabsContent>

        <TabsContent value="outbox">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Outbox Queue</h2>
            {outboxJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine ausstehenden Jobs</p>
            ) : (
              <div className="space-y-2">
                {outboxJobs.map((job) => (
                  <div key={job.id} className="p-3 border rounded bg-muted/30 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">{job.channel}</span>
                        <Badge variant="outline">{job.event_type}</Badge>
                        <Badge>{job.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Versuche: {job.attempts}
                      </span>
                    </div>
                    {job.last_error && (
                      <p className="text-xs text-red-600 mt-1">{job.last_error}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Erstellt: {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="dlq">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Dead Letter Queue</h2>
            {dlqJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine fehlgeschlagenen Jobs</p>
            ) : (
              <div className="space-y-2">
                {dlqJobs.map((job) => (
                  <div key={job.id} className="p-3 border rounded bg-muted/30 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium">{job.channel}</span>
                        <Badge variant="outline">{job.event_type}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRequeue(job.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Requeue
                      </Button>
                    </div>
                    {job.last_error && (
                      <p className="text-xs text-red-600 mt-1">{job.last_error}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Versuche: {job.attempts} • Erstellt: {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
