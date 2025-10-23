import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, FileDown, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ComplianceSummary {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  success_rate: number;
  last_run_at: string | null;
}

interface HistoricalData {
  date: string;
  success_rate: number;
}

export const ComplianceStatusCard = ({ companyId }: { companyId: string }) => {
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);

  useEffect(() => {
    loadComplianceData();
    loadHistoricalData();
  }, [companyId]);

  const loadComplianceData = async () => {
    try {
      const { data, error } = await supabase
        .from("v_compliance_summary")
        .select("*")
        .eq("tenant_id", companyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading compliance summary:", error);
      }
      
      setCompliance(data);
    } catch (err) {
      console.error("Failed to load compliance summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      // Get last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from("check_results")
        .select("created_at, outcome")
        .eq("tenant_id", companyId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (data) {
        // Group by date and calculate success rate
        const groupedByDate = data.reduce((acc: Record<string, { passed: number; total: number }>, result) => {
          const date = new Date(result.created_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { passed: 0, total: 0 };
          }
          acc[date].total++;
          if (result.outcome === 'pass') {
            acc[date].passed++;
          }
          return acc;
        }, {});

        const historical = Object.entries(groupedByDate).map(([date, stats]) => ({
          date,
          success_rate: (stats.passed / stats.total) * 100,
        }));

        setHistoricalData(historical);
      }
    } catch (err) {
      console.error("Failed to load historical data:", err);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-compliance-report');
      
      if (error) throw error;

      if (!data?.path) {
        toast.warning("Report generated but file path not returned");
        setGenerating(false);
        return;
      }

      toast.success(`Compliance report generated and sent to ${data.emailsSent || 0} admin(s)`);
      
      // Download the PDF
      const { data: blob, error: downloadError } = await supabase.storage
        .from('compliance-reports')
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
        a.download = 'compliance-report.pdf';
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
            <ShieldCheck className="h-5 w-5 text-primary" />
            Compliance Status
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

  const successRate = compliance?.success_rate || 0;
  const statusVariant = successRate >= 80 
    ? "default" 
    : successRate >= 60 
      ? "secondary"
      : "destructive";

  const getHealthColor = () => {
    if (successRate >= 80) return "text-success";
    if (successRate >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Compliance Status
        </CardTitle>
        <CardDescription>AI Act & NIS2 compliance overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!compliance || compliance.total === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No compliance data available</p>
              <p className="text-sm mt-2">Run compliance checks to generate your first report</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Success Rate</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getHealthColor()} animate-pulse`} />
                  <Badge variant={statusVariant} className="text-lg px-3 py-1">
                    {successRate}%
                  </Badge>
                </div>
              </div>

              {historicalData.length > 0 && (
                <div className="mt-4 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">7-Day Trend</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {historicalData.length} data points
                    </span>
                  </div>
                  <div className="space-y-1">
                    {historicalData.slice(-7).map((point, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-muted-foreground">
                          {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${point.success_rate}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-medium">
                          {Math.round(point.success_rate)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1 text-success" />
                  <div className="text-2xl font-bold">{compliance.passed}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>

                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
                  <div className="text-2xl font-bold">{compliance.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>

                <div className="text-center p-3 rounded-lg bg-warning/10" title="AI Act control mapping may require review">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-warning" />
                  <div className="text-2xl font-bold">{compliance.warnings}</div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Checks</span>
                  <span className="font-semibold">{compliance.total}</span>
                </div>
                {compliance.last_run_at && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Last Run</span>
                    <span className="text-xs">
                      {new Date(compliance.last_run_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download Compliance Report
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
