import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";

type Severity = "low" | "medium" | "high" | "critical";
type Outcome = "pass" | "fail" | "warn";

type RuleRow = {
  id: string;
  code: string;
  title: string;
  severity: Severity;
  last_outcome: Outcome | null;
  last_at: string | null;
};

type ControlMappingItem = {
  control: { id: string; code: string; title: string };
  rules: RuleRow[];
};

export default function ControlsMapping() {
  const { t } = useTranslation(['checks', 'common']);
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters (URL-persistiert)
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [withRulesOnly, setWithRulesOnly] = useState(searchParams.get("withRulesOnly") === "1");
  const [sev, setSev] = useState<Severity[]>(
    (searchParams.get("severity")?.split(",").filter(Boolean) as Severity[]) || []
  );
  const [out, setOut] = useState<Outcome[]>(
    (searchParams.get("outcome")?.split(",").filter(Boolean) as Outcome[]) || []
  );

  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const pageSize = 50;

  const [items, setItems] = useState<ControlMappingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Persist to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (withRulesOnly) params.set("withRulesOnly", "1");
    if (sev.length) params.set("severity", sev.join(","));
    if (out.length) params.set("outcome", out.join(","));
    if (page !== 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [q, withRulesOnly, sev, out, page, setSearchParams]);

  // Debounced load
  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, withRulesOnly, sev, out, page]);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-control-mapping", {
        body: {
          page,
          pageSize,
          filters: { q, withRulesOnly, severity: sev, outcome: out },
        },
      });
      if (error) throw error;
      setItems(data?.items || []);
      setTotal(data?.pagination?.total || 0);
    } catch (e) {
      console.error("[mapping] load error", e);
      toast({ title: t("checks:errors.load_failed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const toggleArr = <T extends string>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("checks:mapping.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("checks:mapping.subtitle")}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  disabled={isAdmin !== true || exporting || loading || !items.length}
                  onClick={async () => {
                    if (!items.length) {
                      toast({
                        title: t("checks:errors.noResultsToExport"),
                        variant: "destructive"
                      });
                      return;
                    }
                    setExporting(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("export-control-mapping", {
                        body: { filters: { q, withRulesOnly, severity: sev, outcome: out } },
                      });
                      if (error) throw error;
                      const filename = `control_mapping_${new Date().toISOString().split("T")[0]}.csv`;
                      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = filename;
                      link.click();
                      URL.revokeObjectURL(link.href);
                      toast({ 
                        title: t("checks:success.exported"), 
                        description: `${t("checks:success.exported_desc")} (${filename})` 
                      });
                    } catch (e) {
                      console.error("[mapping] export error", e);
                      toast({ title: t("checks:errors.export_failed"), variant: "destructive" });
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("common:loading")}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {(isAdmin === false || !items.length) && (
              <TooltipContent>
                {isAdmin === false ? t('common:tooltips.adminOnly') : t("checks:errors.noResultsToExport")}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("checks:filters.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder={t("checks:mapping.filters.search") || ""}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Switch checked={withRulesOnly} onCheckedChange={setWithRulesOnly} id="with-rules" />
              <label htmlFor="with-rules" className="text-sm cursor-pointer">
                {t("checks:mapping.filters.withRulesOnly")}
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("checks:mapping.filters.severity")}</div>
            <div className="flex flex-wrap gap-2">
              {(["low", "medium", "high", "critical"] as Severity[]).map(s => (
                <Badge
                  key={s}
                  variant={sev.includes(s) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSev(prev => toggleArr(prev, s))}
                >
                  {t(`common:severity.${s}`)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">{t("checks:mapping.filters.outcome")}</div>
            <div className="flex flex-wrap gap-2">
              {(["pass", "fail", "warn"] as Outcome[]).map(o => (
                <Badge
                  key={o}
                  variant={out.includes(o) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setOut(prev => toggleArr(prev, o))}
                >
                  {t(`checks:outcome.${o}`)}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />
          <div className="text-sm text-muted-foreground">
            {total
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total}`
              : "0"}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-3 items-center border-b py-3">
                  <Skeleton className="h-4 w-32 col-span-2" />
                  <Skeleton className="h-4 w-48 col-span-2" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : !items.length ? (
            <div className="p-6 text-center text-muted-foreground">
              {t("checks:mapping.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="py-3 px-4">{t("checks:mapping.columns.control")}</th>
                    <th className="py-3 px-4">{t("checks:mapping.columns.rulesCount")}</th>
                    <th className="py-3 px-4">{t("checks:mapping.columns.lastStatus")}</th>
                    <th className="py-3 px-4">{t("checks:mapping.columns.rule")}</th>
                    <th className="py-3 px-4">{t("checks:mapping.columns.lastOutcome")}</th>
                    <th className="py-3 px-4">{t("checks:mapping.columns.lastAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => {
                    const agg = aggregate(row.rules);
                    return (
                      <tr key={row.control.id} className="border-t align-top hover:bg-muted/50">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium font-mono text-sm">{row.control.code}</div>
                          <div className="text-xs text-muted-foreground mt-1">{row.control.title}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">{row.rules.length}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {agg ? (
                            <Badge variant={agg.variant}>{agg.label}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-2">
                            {row.rules.map(r => (
                              <div key={r.id} className="flex items-center gap-2">
                                <span className="font-mono text-xs">{r.code}</span>
                                <Badge variant="outline" className="text-xs">
                                  {t(`common:severity.${r.severity}`)}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate max-w-xs">
                                  {r.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-2">
                            {row.rules.map(r => (
                              <div key={r.id}>
                                {r.last_outcome ? (
                                  <Badge 
                                    variant={
                                      r.last_outcome === "pass" ? "default" : 
                                      r.last_outcome === "fail" ? "destructive" : 
                                      "secondary"
                                    }
                                  >
                                    {t(`checks:outcome.${r.last_outcome}`)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-2">
                            {row.rules.map(r => (
                              <div key={r.id} className="text-xs text-muted-foreground">
                                {r.last_at ? format(new Date(r.last_at), "PPp") : "—"}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground" aria-label="Pagination info">
          {total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total}` : "0"}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            disabled={page === 1 || loading} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            {t("common:previous") || "Previous"}
          </Button>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            {t("common:next") || "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function aggregate(rules: RuleRow[]) {
  if (!rules.length) return null;
  // Aggregationslogik: fail > warn > pass/null
  if (rules.some(r => r.last_outcome === "fail")) 
    return { label: "Fail", variant: "destructive" as const };
  if (rules.some(r => r.last_outcome === "warn")) 
    return { label: "Warn", variant: "secondary" as const };
  if (rules.some(r => r.last_outcome === "pass")) 
    return { label: "Pass", variant: "default" as const };
  return null;
}
