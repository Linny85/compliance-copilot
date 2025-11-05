import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

type Outcome = "pass" | "fail" | "warn";
type RunStatus = "running" | "success" | "failed" | "partial";
type Severity = "low" | "medium" | "high" | "critical";

interface RunDetail {
  run: {
    id: string;
    status: RunStatus;
    window_start: string;
    window_end: string;
    requested_by?: string;
    started_at: string;
    finished_at?: string;
  };
  results: Array<{
    id: string;
    outcome: Outcome;
    message?: string;
    details?: any;
    rule: {
      id: string;
      code: string;
      title: string;
      severity: Severity;
      kind: string;
      control_id?: string;
    };
    control?: {
      code: string;
      title: string;
    } | null;
  }>;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string | null;
  onRerun?: (ruleId: string) => void;
};

export function ResultDetailsDialog({ open, onOpenChange, runId, onRerun }: Props) {
  const { t } = useTranslation(["checks", "common"]);
  const [data, setData] = React.useState<RunDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !runId) {
      setData(null);
      return;
    }

    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: response, error } = await supabase.functions.invoke("get-run-details", {
          body: { run_id: runId }
        });
        if (!active) return;
        if (error) throw error;
        setData(response);
      } catch (e) {
        console.error("[ResultDetailsDialog] Fetch error:", e);
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, runId]);

  const outcomeColors: Record<Outcome, string> = {
    pass: "bg-green-500/10 text-green-700 dark:text-green-400",
    fail: "bg-red-500/10 text-red-700 dark:text-red-400",
    warn: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
  };

  const statusColors: Record<RunStatus, string> = {
    running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    success: "bg-green-500/10 text-green-700 dark:text-green-400",
    failed: "bg-red-500/10 text-red-700 dark:text-red-400",
    partial: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
  };

  const severityColors: Record<Severity, string> = {
    low: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
    medium: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    critical: "bg-red-500/10 text-red-700 dark:text-red-400"
  };

  if (loading || !data) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby="result-details-desc">
          <DialogHeader>
            <DialogTitle>{t("checks:drilldown.title")}</DialogTitle>
            <DialogDescription id="result-details-desc">
              {loading ? t("common:loading") : t("checks:drilldown.noData")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            {loading ? t("common:loading") : t("checks:drilldown.noData")}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { run, results } = data;
  const mainResult = results[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby="result-main-desc">
        <DialogHeader>
          <DialogTitle>{t("checks:drilldown.title")}</DialogTitle>
          <DialogDescription id="result-main-desc">
            {t("checks:drilldown.description", "View detailed results and information for this check run")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Run Info */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">{t("checks:drilldown.runId")}</Label>
              <p className="text-sm font-mono">{run.id.slice(0, 8)}...</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("checks:labels.status")}</Label>
              <Badge className={statusColors[run.status]}>{t(`checks:status.${run.status}`)}</Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("checks:drilldown.windowStart")}</Label>
              <p className="text-sm">{format(new Date(run.window_start), "PPpp")}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("checks:drilldown.windowEnd")}</Label>
              <p className="text-sm">{format(new Date(run.window_end), "PPpp")}</p>
            </div>
          </div>

          {/* Results */}
          {results.map((result) => (
            <div key={result.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{result.rule.code}: {result.rule.title}</p>
                  {result.control && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("checks:drilldown.control")}: {result.control.code} - {result.control.title}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge className={severityColors[result.rule.severity]}>
                    {t(`common:severity.${result.rule.severity}`)}
                  </Badge>
                  <Badge className={outcomeColors[result.outcome]}>
                    {t(`checks:outcome.${result.outcome}`)}
                  </Badge>
                </div>
              </div>

              {result.message && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("checks:labels.message")}</Label>
                  <p className="text-sm mt-1">{result.message}</p>
                </div>
              )}

              {result.details && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("checks:drilldown.details")}</Label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}

              {onRerun && (
                <button
                  onClick={() => onRerun(result.rule.id)}
                  className="text-xs text-primary hover:underline"
                >
                  {t("checks:drilldown.rerun")}
                </button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
