import { useEffect, useMemo, useState } from "react";
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
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setData(data as OpsMetrics);
    setLoading(false);
  }

  useEffect(() => { load(); }, [sinceHours, tick]);

  const cards = useMemo(() => ([
    { label: "Pending", value: data?.pending ?? 0, description: "Jobs waiting to be processed", href: "/admin/integrations?tab=pending" },
    { label: "Dead (24h)", value: data?.dead24h ?? 0, description: "Failed jobs in last 24h", href: "/admin/integrations?tab=dead" },
    { label: "Delivered (24h)", value: data?.delivered24h ?? 0, description: "Successfully delivered", href: "/admin/integrations?tab=delivered" },
    { label: "Avg Attempts (7d)", value: data?.avgAttempts7d ?? 0, description: "Average retries needed", href: undefined }
  ]), [data]);

  return (
    <AdminLayout>
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Ops Dashboard</h1>
      </header>

      {/* KPI Cards - stable grid prevents overlap and drift */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 min-w-0">
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
            <CardTitle>Top Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.topErrors24h?.length ? (
              <div className="text-sm text-muted-foreground">No errors in the lookback window.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Error</th>
                      <th className="text-right py-3 font-medium w-24">Count</th>
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

      {/* Lookback & Refresh Controls - moved to bottom */}
      <div className="mt-6 flex justify-center items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Lookback</label>
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
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
    </AdminLayout>
  );
}
