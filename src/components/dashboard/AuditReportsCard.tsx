import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuditTaskWithReport {
  id: string;
  title: string;
  status: string;
  report_generated_at: string;
  last_report_path: string;
}

export function AuditReportsCard() {
  const [reports, setReports] = useState<AuditTaskWithReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentReports();
  }, []);

  async function loadRecentReports() {
    try {
      const { data, error } = await supabase
        .from("audit_tasks")
        .select("id, title, status, report_generated_at, last_report_path")
        .not("report_generated_at", "is", null)
        .order("report_generated_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Failed to load audit reports:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(path: string, title: string) {
    try {
      const { data, error } = await supabase.storage
        .from("reports")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download report");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Reports</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Audit Reports</CardTitle>
            <CardDescription>Latest generated compliance reports</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/audit")}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No reports generated yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/audit/new")}
            >
              Create Audit Task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{report.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {report.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(report.report_generated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(report.last_report_path, report.title)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/audit/${report.id}`)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
