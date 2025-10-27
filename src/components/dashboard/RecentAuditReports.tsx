import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type ReportRow = {
  id: string;
  title: string;
  status: string;
  report_generated_at: string | null;
  last_report_path: string | null;
};

export default function RecentAuditReports() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { tx } = useI18n();

  useEffect(() => {
    void loadRecentReports();
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
    } catch (err) {
      console.error("Failed to load audit reports:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(path: string | null, title: string) {
    if (!path) return;
    try {
      const { data, error } = await supabase.storage.from("reports").download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download report");
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-start justify-between space-y-0">
        <div>
          <CardTitle>{tx('dashboard.recentAuditReports')}</CardTitle>
          <CardDescription>{tx('dashboard.recentAuditReportsDesc')}</CardDescription>
        </div>
        <Button variant="ghost" onClick={() => navigate("/audit")}>{tx('dashboard.viewAll')}</Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">{tx('common.loading')}</div>
        ) : reports.length === 0 ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{tx('dashboard.noReportsYet')}</div>
            <Button onClick={() => navigate("/audit/new")}>{tx('dashboard.createAuditTask')}</Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.title}</span>
                    <Badge variant="outline">{r.status}</Badge>
                    {r.report_generated_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.report_generated_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDownload(r.last_report_path, r.title)}
                    disabled={!r.last_report_path}
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/audit/${r.id}`)}
                    title="Open"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
