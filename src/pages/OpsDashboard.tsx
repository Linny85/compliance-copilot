import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/layouts/AdminLayout";
import { RefreshCw } from "lucide-react";
import EmailStatsDashboard from "@/components/EmailStatsDashboard";

type OpsMetrics = {
  pending: number;
  dead24h: number;
  delivered24h: number;
  avgAttempts7d: number;
  topErrors24h: { error: string; cnt: number }[];
};

export default function OpsDashboard() {
  const { t, ready } = useTranslation(['reports', 'common'], { useSuspense: false });
  const { toast } = useToast();
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [sinceHours, setSinceHours] = useState(24);
  const [tick, setTick] = useState(0);

  // Auto-Refresh alle 30s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("ops_metrics", { p_lookback_hours: sinceHours });
    if (error) {
      toast({ 
        title: ready ? t('common:error.title') : 'Failed to load', 
        description: error.message, 
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }
    setData(data as OpsMetrics);
    setLoading(false);
  }

  useEffect(() => { if (ready) load(); }, [sinceHours, tick, ready]);

  const cards = useMemo(() => ready ? [
    { label: t('reports:metrics.pending'), value: data?.pending ?? 0, description: t('reports:metrics.pendingDesc'), href: "/admin/integrations?tab=pending" },
    { label: t('reports:metrics.dead24h'), value: data?.dead24h ?? 0, description: t('reports:metrics.dead24hDesc'), href: "/admin/integrations?tab=dead" },
    { label: t('reports:metrics.delivered24h'), value: data?.delivered24h ?? 0, description: t('reports:metrics.delivered24hDesc'), href: "/admin/integrations?tab=delivered" },
    { label: t('reports:metrics.avgAttempts7d'), value: data?.avgAttempts7d ?? 0, description: t('reports:metrics.avgAttempts7dDesc'), href: undefined }
  ] : [], [data, t, ready]);

  // Single render path to prevent hook ordering issues
  let content: React.ReactNode;
  
  if (!ready || loading) {
    content = (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">{t('reports:title')}</h1>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 min-w-0">
          {cards.map((c) => (
            <Card 
              key={c.label} 
              className={`min-w-0 ${c.href ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}`}
              onClick={() => c.href && (window.location.href = c.href)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Email Statistics */}
        <section className="mb-6">
          <EmailStatsDashboard />
        </section>

        {/* Top Errors */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:errors.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.topErrors24h?.length ? (
                <div className="text-sm text-muted-foreground">{t('reports:errors.empty')}</div>
              ) : (
                <div className="table-responsive -mx-4 sm:mx-0">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium">{t('reports:errors.error')}</th>
                        <th className="text-right py-3 font-medium w-24">{t('reports:errors.count')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topErrors24h.map((e, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-mono text-xs">
                            <a 
                              href={`/admin/integrations?tab=dead&q=${encodeURIComponent(e.error)}`}
                              className="underline hover:text-primary"
                            >
                              {e.error}
                            </a>
                          </td>
                          <td className="py-3 text-right font-semibold">{e.cnt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Controls */}
        <div className="mt-6 flex justify-center items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t('reports:controls.lookback')}</label>
            <Select value={sinceHours.toString()} onValueChange={(v) => setSinceHours(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6h</SelectItem>
                <SelectItem value="12">12h</SelectItem>
                <SelectItem value="24">24h</SelectItem>
                <SelectItem value="48">48h</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={load} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : t('reports:controls.refresh')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <AdminLayout>
      {content}
    </AdminLayout>
  );
}
