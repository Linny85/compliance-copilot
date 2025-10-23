import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, LoaderCircle, Circle, Plus } from "lucide-react";

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Outcome = 'pass' | 'fail' | 'warn';
type RuleKind = 'static' | 'query' | 'http' | 'script';
type RunStatus = 'running' | 'success' | 'failed' | 'partial';

interface CheckRule {
  id: string;
  code: string;
  title: string;
  description?: string;
  kind: RuleKind;
  severity: Severity;
  enabled: boolean;
  schedule?: string;
  control_id: string;
  controls?: { code: string; title: string } | null;
  spec?: any;
}

interface CheckResult {
  id: string;
  outcome: Outcome;
  message?: string | null;
  created_at: string;
  check_rules: { code: string; title: string; severity: Severity; control_id: string | null };
  check_runs: { status: RunStatus; window_start: string; window_end: string };
}

export default function ChecksPage() {
  const { t } = useTranslation(["checks", "common"]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rules, setRules] = useState<CheckRule[]>([]);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, resultsRes] = await Promise.all([
        supabase.functions.invoke("list-checks"),
        supabase.functions.invoke("list-results", {
          body: { page: 1, pageSize: 50 },
        }),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      if (resultsRes.error) {
        const msg = typeof resultsRes.error === 'string'
          ? resultsRes.error
          : (resultsRes.error.message || JSON.stringify(resultsRes.error));
        throw new Error(msg);
      }

      setRules(rulesRes.data?.checks || []);
      setResults(resultsRes.data?.results || []);
    } catch (error: any) {
      console.error("Failed to load checks:", error);
      toast({
        title: t("checks:errors.load_failed"),
        description: error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runChecks = async (ruleIds?: string[]) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-checks", {
        body: {
          period: "ad-hoc",
          rule_ids: ruleIds,
        },
      });

      if (error) throw error;

      toast({ title: t("checks:success.checks_run") });
      loadData();
    } catch (error: any) {
      console.error("Failed to run checks:", error);
      toast({
        title: t("checks:errors.run_failed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const severityColors: Record<Severity, string> = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const getSeverityColor = (s: Severity): string => severityColors[s];

  const getOutcomeIcon = (outcome: Outcome) => {
    switch (outcome) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
      case "fail":
        return <XCircle className="h-4 w-4" aria-hidden="true" />;
      case "warn":
        return <AlertCircle className="h-4 w-4" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const outcomeColors: Record<Outcome, string> = {
    pass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    fail: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  };

  const getOutcomeColor = (o: Outcome): string => outcomeColors[o];

  const getRunStatusIcon = (status: RunStatus) => {
    switch (status) {
      case "running":
        return <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
      case "failed":
        return <XCircle className="h-3.5 w-3.5" aria-hidden="true" />;
      case "partial":
        return <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />;
      default:
        return <Circle className="h-3.5 w-3.5" aria-hidden="true" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("checks:title")}</h1>
          <p className="text-muted-foreground mt-2">{t("checks:subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/checks/new")} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {t("checks:actions.newRule")}
          </Button>
          <Button onClick={() => loadData()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => runChecks()} disabled={running || rules.length === 0}>
            <PlayCircle className="h-4 w-4 mr-2" />
            {running ? t("common:loading") : t("checks:actions.runAll")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">{t("checks:tabs.rules")}</TabsTrigger>
          <TabsTrigger value="results">{t("checks:tabs.results")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("common:loading")}</p>
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PlayCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("checks:empty.noRules")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{rule.title}</CardTitle>
                          {!rule.enabled && (
                            <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">
                              {t("common:disabled")}
                            </Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{rule.code}</Badge>
                          <Badge className={getSeverityColor(rule.severity)}>
                            {t(`common:severity.${rule.severity}`)}
                          </Badge>
                          <Badge variant="secondary">{t(`checks:kind.${rule.kind}`)}</Badge>
                          {rule.controls && (
                            <Badge variant="outline">
                              {rule.controls.code}: {rule.controls.title}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => runChecks([rule.id])}
                        disabled={running || !rule.enabled}
                        size="sm"
                        variant="outline"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        {t("checks:actions.runSelected")}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("common:loading")}</p>
            </div>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("checks:empty.noResults")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {results.map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getOutcomeColor(result.outcome)}>
                            <span className="flex items-center gap-1">
                              {getOutcomeIcon(result.outcome)}
                              {t(`checks:outcome.${result.outcome}`)}
                            </span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {result.check_rules.code}: {result.check_rules.title}
                          </span>
                        </div>
                        {result.message && (
                          <p className="text-sm text-muted-foreground">{result.message}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(result.created_at).toLocaleString()}</span>
                          {(() => {
                            const sev = (result.check_rules?.severity ?? 'medium') as Severity;
                            return (
                              <Badge className={getSeverityColor(sev)} variant="outline">
                                {t(`common:severity.${sev}`)}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            const runStatus = (result.check_runs?.status ?? 'success') as RunStatus;
                            return (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 border">
                                {getRunStatusIcon(runStatus)}
                                {t(`common:status.${runStatus}`)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
