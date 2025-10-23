import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TenantSettings {
  id: string;
  tenant_id: string;
  notification_email: string | null;
  notification_webhook_url: string | null;
  webhook_domain_allowlist: string[] | null;
  webhook_secret: string | null;
}

export default function SettingsNotifications() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [formData, setFormData] = useState({
    notification_email: '',
    notification_webhook_url: '',
    webhook_domain_allowlist: [] as string[],
  });
  const [allowlistInput, setAllowlistInput] = useState('');
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, medianMs: 0 });

  // Redirect non-admins
  useEffect(() => {
    if (isAdmin === false) {
      toast({
        title: t('common:forbidden'),
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [isAdmin, navigate, t, toast]);

  // Load settings
  useEffect(() => {
    if (isAdmin !== true) return;

    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.company_id) return;

        const { data, error } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', profile.company_id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setSettings(data as TenantSettings);
          setFormData({
            notification_email: data.notification_email || '',
            notification_webhook_url: data.notification_webhook_url || '',
            webhook_domain_allowlist: data.webhook_domain_allowlist || [],
          });
        }
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        toast({
          title: t('common:error'),
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [isAdmin, t, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from('tenant_settings')
          .update({
            notification_email: formData.notification_email || null,
            notification_webhook_url: formData.notification_webhook_url || null,
            webhook_domain_allowlist: formData.webhook_domain_allowlist,
          })
          .eq('tenant_id', profile.company_id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('tenant_settings')
          .insert({
            tenant_id: profile.company_id,
            notification_email: formData.notification_email || null,
            notification_webhook_url: formData.notification_webhook_url || null,
            webhook_domain_allowlist: formData.webhook_domain_allowlist,
          });

        if (error) throw error;
      }

      toast({
        title: t('common:success'),
        description: 'Notification settings saved',
      });

      // Reload
      const { data } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', profile.company_id)
        .maybeSingle();

      if (data) {
        setSettings(data as TenantSettings);
        // Reload deliveries after save
        loadDeliveries(profile.company_id);
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast({
        title: t('common:error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const loadDeliveries = async (tenantId: string) => {
    try {
      // Recent deliveries (last 10)
      const { data: deliveries } = await supabase
        .from('notification_deliveries')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentDeliveries(deliveries || []);

      // Stats for last 24h
      const { data: last24h } = await supabase
        .from('notification_deliveries')
        .select('status_code, duration_ms')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (last24h && last24h.length > 0) {
        const sent = last24h.filter(d => d.status_code && d.status_code < 400).length;
        const failed = last24h.length - sent;
        const durations = last24h.map(d => d.duration_ms).filter(Boolean).sort((a, b) => a - b);
        const medianMs = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;
        setStats({ sent, failed, medianMs });
      }
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    }
  };

  const handleRegenerateSecret = async () => {
    if (!confirm('Regenerate webhook secret? Existing integrations will stop working.')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      // Generate new secret
      const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase
        .from('tenant_settings')
        .update({ webhook_secret: newSecret })
        .eq('tenant_id', profile.company_id);

      if (error) throw error;

      // Reload
      const { data } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', profile.company_id)
        .maybeSingle();

      if (data) setSettings(data as TenantSettings);

      toast({
        title: t('common:success'),
        description: 'Webhook secret regenerated',
      });
    } catch (err: any) {
      console.error('Failed to regenerate secret:', err);
      toast({
        title: t('common:error'),
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopySecret = () => {
    if (settings?.webhook_secret) {
      navigator.clipboard.writeText(settings.webhook_secret);
      toast({
        title: 'Copied',
        description: 'Webhook secret copied to clipboard',
      });
    }
  };

  const handleAddDomain = () => {
    const domain = allowlistInput.trim().toLowerCase();
    if (domain && !formData.webhook_domain_allowlist.includes(domain)) {
      setFormData(prev => ({
        ...prev,
        webhook_domain_allowlist: [...prev.webhook_domain_allowlist, domain]
      }));
      setAllowlistInput('');
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      webhook_domain_allowlist: prev.webhook_domain_allowlist.filter(d => d !== domain)
    }));
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      // Insert synthetic test event into queue
      const { error } = await supabase
        .from('run_events_queue')
        .insert({
          tenant_id: profile.company_id,
          run_id: '00000000-0000-0000-0000-000000000000',
          status: 'success',
          rule_code: 'TEST',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Test notification dispatched',
        description: 'Check your configured endpoints in a few moments',
      });

      // Reload deliveries after a short delay
      setTimeout(() => loadDeliveries(profile.company_id), 3000);
    } catch (err: any) {
      toast({
        title: t('common:error'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (isAdmin !== true || loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure email and webhook notifications for check run status changes
        </p>
      </div>

      <div className="space-y-6">
        {/* Stats Card */}
        {stats.sent > 0 || stats.failed > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Last 24 Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.medianMs}ms</div>
                  <div className="text-sm text-muted-foreground">Median Latency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Comma-separated list of email addresses to notify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notification_email">Email Addresses</Label>
              <Input
                id="notification_email"
                type="text"
                placeholder="admin@example.com, ops@example.com"
                value={formData.notification_email}
                onChange={(e) => setFormData(prev => ({ ...prev, notification_email: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Separate multiple addresses with commas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Notifications</CardTitle>
            <CardDescription>
              Send POST requests to a webhook URL when check runs complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notification_webhook_url">Webhook URL</Label>
              <Input
                id="notification_webhook_url"
                type="url"
                placeholder="https://your-app.com/webhooks/compliance"
                value={formData.notification_webhook_url}
                onChange={(e) => setFormData(prev => ({ ...prev, notification_webhook_url: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="webhook_domain_allowlist">Domain Allowlist</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="webhook_domain_allowlist"
                  type="text"
                  placeholder="example.com"
                  value={allowlistInput}
                  onChange={(e) => setAllowlistInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
                />
                <Button type="button" onClick={handleAddDomain} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.webhook_domain_allowlist.map(domain => (
                  <Badge key={domain} variant="secondary">
                    {domain}
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Only allow webhooks to these domains (leave empty to allow all)
              </p>
            </div>

            <div>
              <Label>Webhook Secret</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  value={settings?.webhook_secret || 'Not generated yet'}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  disabled={!settings?.webhook_secret}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRegenerateSecret}
                  disabled={!settings}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use this secret to verify webhook signatures (HMAC-SHA256 in X-Signature header)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={handleTestNotification}
            disabled={testing || !settings}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Test Notification
          </Button>
        </div>

        {/* Recent Deliveries */}
        {recentDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>Last 10 notification attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Badge variant={delivery.status_code < 400 ? 'default' : 'destructive'}>
                        {delivery.channel}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-mono">
                        {delivery.run_id.substring(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(delivery.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {delivery.duration_ms && (
                        <span className="text-sm text-muted-foreground">{delivery.duration_ms}ms</span>
                      )}
                      <Badge variant={delivery.status_code < 400 ? 'outline' : 'destructive'}>
                        {delivery.status_code || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
