import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, AlertTriangle, CheckCircle, PlayCircle, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface QAMonitor {
  last_run_status: string | null;
  last_run_at: string | null;
  avg_latency_ms: number | null;
  failed_24h: number;
  updated_at: string | null;
}

export const QAMonitorCard = ({ companyId }: { companyId: string }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [monitor, setMonitor] = useState<QAMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadMonitorData();
  }, [companyId]);

  const loadMonitorData = async () => {
    try {
      const { data, error } = await supabase
        .from("qa_monitor")
        .select("*")
        .eq("tenant_id", companyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading QA monitor:", error);
      }
      
      setMonitor(data);
    } catch (err) {
      console.error("Failed to load QA monitor:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQA = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('qa-test-suite');
      
      if (error) throw error;

      toast.success("QA test suite started - processing events...");
      
      // Reload monitor data after processing time (5-8s for queue + notify)
      setTimeout(() => {
        loadMonitorData();
        toast.success("QA monitor updated");
      }, 6000);
    } catch (err: any) {
      toast.error(`Failed to run QA suite: ${err.message}`);
      setRunning(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-qa-report');
      
      if (error) throw error;

      if (!data?.path) {
        toast.warning("Report generated but file path not returned");
        setGenerating(false);
        return;
      }

      toast.success("QA report generated successfully");
      
      // Download the PDF
      const { data: blob, error: downloadError } = await supabase.storage
        .from('qa-reports')
        .download(data.path);
      
      if (downloadError) {
        toast.error(`Failed to download report: ${downloadError.message}`);
        setGenerating(false);
        return;
      }
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qa-report.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      toast.error(`Failed to generate report: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('admin:qa.title')}
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

  const passedTests = monitor?.last_run_status?.split('/')?.[0] || '0';
  const totalTests = monitor?.last_run_status?.split('/')?.[1] || '0';
  const hasFailures = monitor?.failed_24h && monitor.failed_24h > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {t('admin:qa.title')}
        </CardTitle>
        <CardDescription>{t('admin:qa.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!monitor || (!monitor.last_run_status && !monitor.last_run_at) ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{t('admin:qa.empty')}</p>
              <p className="text-sm mt-2">{t('admin:compliance.noData')}</p>
            </div>
            <Button onClick={handleRunQA} disabled={running}>
              <PlayCircle className="h-4 w-4 mr-2" />
              {running ? t('admin:users.inviteDialog.sending') : t('admin:qa.actions.runFirst')}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Last Run Status
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{passedTests}</span>
                  <span className="text-muted-foreground">/ {totalTests}</span>
                  {passedTests === totalTests && totalTests !== '0' && (
                    <Badge variant="default" className="ml-2">All Passed</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Avg Latency
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(monitor.avg_latency_ms || 0)} <span className="text-sm font-normal text-muted-foreground">ms</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last Run
                </div>
                <div className="text-sm">
                  {monitor.last_run_at 
                    ? new Date(monitor.last_run_at).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className={`h-4 w-4 ${hasFailures ? 'text-destructive' : ''}`} />
                  Failed (24h)
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${hasFailures ? 'text-destructive' : ''}`}>
                    {monitor.failed_24h}
                  </span>
                  {hasFailures && (
                    <Badge variant="destructive" className="ml-2">Action Required</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <Button 
                  onClick={handleRunQA} 
                  disabled={running}
                  className="flex-1"
                >
                  {running ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run QA Suite
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleGenerateReport}
                  variant="outline"
                  className="flex-1"
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
              
              {monitor.updated_at && (
                <p className="text-xs text-muted-foreground text-center">
                  Last updated: {new Date(monitor.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
