import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Alert = {
  id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  muted_until: string | null;
  metadata: Record<string, any>;
};

export function AlertsPanel({ companyId }: { companyId: string }) {
  const { t } = useTranslation(['admin', 'common']);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [muteHours, setMuteHours] = useState("24");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alert_history" as any)
        .select("*")
        .eq("tenant_id", companyId)
        .order("triggered_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[AlertsPanel] Load error:", error);
        setAlerts([]);
      } else {
        setAlerts((data as unknown as Alert[]) ?? []);
      }
    } catch (err) {
      console.error("[AlertsPanel] Failed to load:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) load();
  }, [companyId]);

  const handleAction = async (action: "acknowledge" | "mute") => {
    if (!selectedAlert) return;

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("acknowledge-alert", {
        body: {
          alert_id: selectedAlert.id,
          action,
          mute_hours: action === "mute" ? parseInt(muteHours) : undefined,
        },
      });

      if (error) throw error;

      toast.success(
        action === "acknowledge" 
          ? "Alert acknowledged" 
          : `Alert muted for ${muteHours} hours`
      );
      setActionDialog(false);
      setSelectedAlert(null);
      load();
    } catch (e: any) {
      toast.error(`Failed to ${action} alert: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "failure_spike":
        return <AlertTriangle className="h-4 w-4" />;
      case "anomaly":
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const activeAlerts = alerts.filter(a => !a.acknowledged_at && (!a.muted_until || new Date(a.muted_until) < new Date()));
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged_at);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('admin:compliance.alerts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('admin:compliance.alerts.title')}
          </CardTitle>
          <CardDescription>
            {t('admin:compliance.alerts.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-sm">
                  {activeAlerts.filter(a => a.severity === "critical").length}
                </Badge>
                <span className="text-sm text-muted-foreground">{t('admin:compliance.alerts.severity.critical')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {activeAlerts.filter(a => a.severity === "warning").length}
                </Badge>
                <span className="text-sm text-muted-foreground">{t('admin:compliance.alerts.severity.warning')}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('admin:compliance.alerts.refresh')}
            </Button>
          </div>

          {/* Active Alerts */}
          {activeAlerts.length === 0 ? (
            <div className="rounded-md border p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t('admin:compliance.alerts.none')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Active Alerts</h3>
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedAlert(alert);
                    setActionDialog(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.alert_type)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.severity) as any}>
                            {t(`admin:compliance.alerts.severity.${alert.severity}`)}
                          </Badge>
                          <span className="text-sm font-medium">{alert.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span>
                      <strong>Metric:</strong> {alert.metric_name}
                    </span>
                    <span>
                      <strong>Value:</strong> {alert.metric_value}
                    </span>
                    <span>
                      <strong>Threshold:</strong> {alert.threshold_value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Acknowledged */}
          {acknowledgedAlerts.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recently Acknowledged ({acknowledgedAlerts.length})
              </h3>
              <div className="space-y-2">
                {acknowledgedAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-md border border-muted p-2 text-xs opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.title}</span>
                      <CheckCircle className="h-3 w-3 text-success" />
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Acknowledged {new Date(alert.acknowledged_at!).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Action</DialogTitle>
            <DialogDescription>
              Choose how to handle this alert
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 space-y-2">
                <Badge variant={getSeverityColor(selectedAlert.severity) as any}>
                  {t(`admin:compliance.alerts.severity.${selectedAlert.severity}`)}
                </Badge>
                <h4 className="font-medium">{selectedAlert.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedAlert.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Mute Duration</Label>
                <Select value={muteHours} onValueChange={setMuteHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleAction("acknowledge")}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge
            </Button>
            <Button
              onClick={() => handleAction("mute")}
              disabled={processing}
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Mute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
