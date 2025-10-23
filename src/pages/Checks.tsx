import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, LoaderCircle, Circle, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ControlSelect } from "@/components/controls/ControlSelect";
import { SpecEditor } from "@/components/checks/SpecEditor";
import { ResultsFilters, ResultFilters } from "@/components/checks/ResultsFilters";
import { ResultDetailsDialog } from "@/components/checks/ResultDetailsDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Eye, Download } from "lucide-react";

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
  run_id: string;
  check_rules: { code: string; title: string; severity: Severity; control_id: string | null };
  check_runs: { status: RunStatus; window_start: string; window_end: string };
}

export default function ChecksPage() {
  const { t } = useTranslation(["checks", "common"]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rules, setRules] = useState<CheckRule[]>([]);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CheckRule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Results filters & pagination
  const [filters, setFilters] = useState<ResultFilters>({
    severity: [],
    outcome: [],
    status: []
  });
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Initialize filters from URL on mount
  useEffect(() => {
    const outcome = searchParams.get('outcome')?.split(',').filter(Boolean) || [];
    const severity = searchParams.get('severity')?.split(',').filter(Boolean) || [];
    const status = searchParams.get('status')?.split(',').filter(Boolean) || [];
    const q = searchParams.get('q') || '';
    const control_id = searchParams.get('control_id') || undefined;
    
    if (outcome.length || severity.length || status.length || q || control_id) {
      setFilters({
        outcome: outcome as Outcome[],
        severity: severity as Severity[],
        status: status as RunStatus[],
        q,
        control_id
      });
    }
  }, []);

  // Persist filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.outcome && filters.outcome.length) params.set('outcome', filters.outcome.join(','));
    if (filters.severity && filters.severity.length) params.set('severity', filters.severity.join(','));
    if (filters.status && filters.status.length) params.set('status', filters.status.join(','));
    if (filters.q) params.set('q', filters.q);
    if (filters.control_id) params.set('control_id', filters.control_id);
    
    setSearchParams(params, { replace: true });
  }, [filters]);

  useEffect(() => {
    loadData();
  }, []);

  // Debounced results loading
  useEffect(() => {
    const timer = setTimeout(() => {
      loadResults();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, resultsPage]);

  const loadResults = async () => {
    setResultsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-results", {
        body: { 
          page: resultsPage, 
          pageSize: 50,
          filters: {
            from: filters.from?.toISOString(),
            to: filters.to?.toISOString(),
            severity: filters.severity,
            outcome: filters.outcome,
            status: filters.status,
            control_id: filters.control_id,
            q: filters.q
          }
        }
      });
      if (error) throw error;
      setResults(data.results || []);
      setResultsTotal(data.pagination?.total || 0);
    } catch (e) {
      console.error('[loadResults] Error:', e);
      toast({ title: t("checks:errors.load_failed"), variant: "destructive" });
    } finally {
      setResultsLoading(false);
    }
  };

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

  const openEditModal = (rule: CheckRule) => {
    setEditingRule(rule);
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-rule", {
        body: { id },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'DELETE_FAILED');
      }

      toast({ title: t("checks:form.success.deleted") });
      loadData();
    } catch (e: any) {
      console.error('[Checks] Delete failed:', e);
      toast({
        title: t("checks:form.errors.delete_failed"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const saveEdit = async () => {
    if (!editingRule) return;
    setSubmitting(true);
    try {
      const payload = {
        id: editingRule.id,
        title: editingRule.title,
        description: editingRule.description,
        severity: editingRule.severity,
        enabled: editingRule.enabled,
        kind: editingRule.kind,
        spec: editingRule.spec,
        control_id: editingRule.control_id || null,
      };

      const { data, error } = await supabase.functions.invoke("update-rule", {
        body: payload,
      });

      if (error || data?.error) {
        const errorCode = data?.error;
        if (errorCode === 'DUPLICATE_CODE') {
          toast({
            title: t("checks:form.errors.duplicate_code"),
            variant: "destructive",
          });
          return;
        }
        throw new Error(data?.error || error?.message || 'UPDATE_FAILED');
      }

      toast({ title: t("checks:form.success.updated") });
      setEditOpen(false);
      loadData();
    } catch (e: any) {
      console.error('[Checks] Update failed:', e);
      toast({
        title: t("checks:form.errors.update_failed"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openEditModal(rule)}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          {t("common:edit")}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t("common:delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("checks:form.delete_confirm_title")}</AlertDialogTitle>
                            </AlertDialogHeader>
                            <p className="text-sm text-muted-foreground">
                              {t("checks:form.delete_confirm_text", { code: rule.code })}
                            </p>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(rule.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("common:delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <ResultsFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => {
                setFilters({ severity: [], outcome: [], status: [] });
                setResultsPage(1);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setExporting(true);
                try {
                  const { data, error } = await supabase.functions.invoke("export-results", {
                    body: { filters }
                  });
                  
                  if (error) throw error;
                  
                  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `check_results_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                  
                  toast({
                    title: t("checks:success.exported"),
                    description: t("checks:success.exported_desc")
                  });
                } catch (e: any) {
                  console.error("[export-results]", e);
                  toast({
                    title: t("checks:errors.export_failed"),
                    variant: "destructive"
                  });
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting || resultsLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? t("common:loading") : t("checks:results.export")}
            </Button>
          </div>

          {resultsLoading ? (
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
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("checks:results.time")}</TableHead>
                      <TableHead>{t("checks:results.rule")}</TableHead>
                      <TableHead>{t("checks:results.outcome")}</TableHead>
                      <TableHead>{t("checks:results.runStatus")}</TableHead>
                      <TableHead>{t("checks:results.severity")}</TableHead>
                      <TableHead className="max-w-xs">{t("checks:results.message")}</TableHead>
                      <TableHead className="text-right">{t("checks:results.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => {
                      const run = result.check_runs;
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(result.created_at), "PPp")}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{result.check_rules.code}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {result.check_rules.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getOutcomeColor(result.outcome)}>
                              <span className="flex items-center gap-1">
                                {getOutcomeIcon(result.outcome)}
                                {t(`checks:outcome.${result.outcome}`)}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-sm">
                              {getRunStatusIcon(run.status)}
                              {t(`checks:status.${run.status}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(result.check_rules.severity)} variant="outline">
                              {t(`common:severity.${result.check_rules.severity}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {result.message || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRunId(result.run_id);
                                setDrilldownOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="ml-1 sr-only sm:not-sr-only sm:inline">
                                {t("checks:results.viewDetails")}
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("checks:results.showing", { 
                    from: (resultsPage - 1) * 50 + 1, 
                    to: Math.min(resultsPage * 50, resultsTotal), 
                    total: resultsTotal 
                  }) || `Showing ${(resultsPage - 1) * 50 + 1}-${Math.min(resultsPage * 50, resultsTotal)} of ${resultsTotal}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                    disabled={resultsPage === 1}
                  >
                    {t("common:previous") || "Previous"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResultsPage(p => p + 1)}
                    disabled={resultsPage * 50 >= resultsTotal}
                  >
                    {t("common:next") || "Next"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Rule Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("checks:form.edit_rule_title")}</DialogTitle>
          </DialogHeader>

          {editingRule && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("checks:form.fields.title")}</Label>
                  <Input
                    value={editingRule.title}
                    onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("checks:form.fields.severity")}</Label>
                  <Select
                    value={editingRule.severity}
                    onValueChange={(v) => setEditingRule({ ...editingRule, severity: v as Severity })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("common:severity.low")}</SelectItem>
                      <SelectItem value="medium">{t("common:severity.medium")}</SelectItem>
                      <SelectItem value="high">{t("common:severity.high")}</SelectItem>
                      <SelectItem value="critical">{t("common:severity.critical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("checks:form.fields.kind")}</Label>
                  <Select
                    value={editingRule.kind}
                    onValueChange={(v) => setEditingRule({ ...editingRule, kind: v as RuleKind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">{t("checks:kind.static")}</SelectItem>
                      <SelectItem value="query">{t("checks:kind.query")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editingRule.enabled}
                    onCheckedChange={(checked) => setEditingRule({ ...editingRule, enabled: checked })}
                  />
                  <Label>{t("checks:form.fields.enabled")}</Label>
                </div>
              </div>

              <div>
                <Label>{t("checks:form.fields.description")}</Label>
                <Textarea
                  rows={3}
                  value={editingRule.description || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                />
              </div>

              <div>
                <Label>{t("checks:form.fields.control_id")}</Label>
                <ControlSelect
                  value={editingRule.control_id || null}
                  onChange={(id) => setEditingRule({ ...editingRule, control_id: id || "" })}
                  placeholder={t("checks:form.placeholders.control_id") || ""}
                />
              </div>

              <div>
                <Label>{t("checks:form.fields.spec")}</Label>
                <SpecEditor
                  kind={editingRule.kind as 'static' | 'query'}
                  value={JSON.stringify(editingRule.spec, null, 2)}
                  onChange={(v) => {
                    try {
                      const parsed = JSON.parse(v);
                      setEditingRule({ ...editingRule, spec: parsed });
                    } catch {
                      // Invalid JSON, keep previous value
                    }
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              {t("common:cancel")}
            </Button>
            <Button onClick={saveEdit} disabled={submitting}>
              {submitting ? t("common:saving") : t("common:save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill-down Details Dialog */}
      <ResultDetailsDialog
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        runId={selectedRunId}
        onRerun={(ruleId) => {
          runChecks([ruleId]);
          setDrilldownOpen(false);
        }}
      />
    </div>
  );
}
