import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, FileDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ComplianceSummary {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  success_rate: number;
  last_run_at: string | null;
}

export const ComplianceStatusCard = ({ companyId }: { companyId: string }) => {
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadComplianceData();
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
                <Badge variant={statusVariant} className="text-lg px-3 py-1">
                  {successRate}%
                </Badge>
              </div>

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

                <div className="text-center p-3 rounded-lg bg-warning/10">
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
