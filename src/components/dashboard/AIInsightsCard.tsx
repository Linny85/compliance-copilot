import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Insight = {
  id: string;
  generated_at: string;
  success_rate: number;
  wow_delta: number;
  top_failures: { rule_code: string; failures: number }[];
  improvements: { rule_code: string; delta: number }[];
  executive_note?: string | null;
  qa_failed_24h: number;
};

export function AIInsightsCard({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [items, setItems] = useState<Insight[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("insight_history" as any)
        .select("id, generated_at, success_rate, wow_delta, top_failures, improvements, executive_note, qa_failed_24h")
        .eq("tenant_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(3);
      
      if (error) {
        console.error("[AIInsights] Load error:", error);
        setItems([]);
      } else {
        setItems((data as unknown as Insight[]) ?? []);
      }
    } catch (err) {
      console.error("[AIInsights] Failed to load:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) load();
  }, [companyId]);

  const generate = async () => {
    setGenLoading(true);
    try {
      const { error } = await supabase.functions.invoke("compliance-insight-agent", {
        body: { generate_note: true }
      });
      
      if (error) throw error;
      
      toast.success("Insights generated – refreshing…");
      setTimeout(load, 1500);
    } catch (e: any) {
      toast.error(`Failed to generate insights: ${e.message}`);
    } finally {
      setGenLoading(false);
    }
  };

  const getRiskBadge = (successRate: number) => {
    if (successRate >= 80) return { label: "Healthy", variant: "default" as const };
    if (successRate >= 60) return { label: "Watch", variant: "secondary" as const };
    return { label: "At Risk", variant: "destructive" as const };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
        <CardDescription>30-day compliance analysis and trends</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Last 3 insights. Daily automated analysis available via cron.
          </div>
          <Button size="sm" onClick={generate} disabled={genLoading}>
            {genLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Now
              </>
            )}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border p-4 text-center">
            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No insights yet. Click <strong>Generate Now</strong> to create your first analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((insight) => {
              const risk = getRiskBadge(insight.success_rate);
              return (
                <div key={insight.id} className="rounded-lg border p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        {new Date(insight.generated_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                        <span className="text-sm">
                          Success Rate: <strong>{insight.success_rate}%</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {insight.wow_delta >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={`text-sm font-medium ${insight.wow_delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {insight.wow_delta >= 0 ? '+' : ''}{insight.wow_delta}%
                      </span>
                      <span className="text-xs text-muted-foreground">WoW</span>
                    </div>
                  </div>

                  {/* Executive Note */}
                  {insight.executive_note && (
                    <div className="text-sm bg-muted/50 p-3 rounded-md">
                      {insight.executive_note}
                    </div>
                  )}

                  {/* QA Alert */}
                  {insight.qa_failed_24h > 0 && (
                    <div className="flex items-center gap-2 text-sm text-warning">
                      <AlertCircle className="h-4 w-4" />
                      <span>{insight.qa_failed_24h} notification failures in last 24h</span>
                    </div>
                  )}

                  {/* Top Failures */}
                  {insight.top_failures && insight.top_failures.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Top Recurring Failures
                      </div>
                      <div className="space-y-1">
                        {insight.top_failures.slice(0, 3).map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <code className="px-2 py-1 rounded bg-muted">{f.rule_code}</code>
                            <Badge variant="destructive" className="text-xs">
                              {f.failures}× failed
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {insight.improvements && insight.improvements.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Most Improved Controls
                      </div>
                      <div className="space-y-1">
                        {insight.improvements.slice(0, 3).map((imp, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <code className="px-2 py-1 rounded bg-muted">{imp.rule_code}</code>
                            <Badge variant="default" className="text-xs bg-success">
                              +{imp.delta}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
