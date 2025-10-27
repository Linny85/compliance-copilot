import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle2, Eye, MousePointerClick, XCircle, RefreshCw, AlertCircle } from "lucide-react";

type EmailStats = {
  template_code: string;
  total_enqueued: number;
  total_sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  bounce_rate_pct: number;
  click_rate_pct: number;
  delivery_rate_pct: number;
  open_rate_pct: number;
  last_activity_at: string;
};

export default function EmailStatsDashboard() {
  const [stats, setStats] = useState<EmailStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const inFlight = useRef(false);

  async function loadStats(isManualRefresh = false) {
    // Overlap guard: prevent concurrent requests
    if (inFlight.current) return;
    
    inFlight.current = true;
    
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("v_email_stats")
        .select("*")
        .order("total_enqueued", { ascending: false });

      if (error) {
        console.error("Failed to load email stats:", error);
        setErrorCount((n) => Math.min(n + 1, 5));
      } else {
        setStats(data || []);
        setErrorCount(0); // Reset error count on success
      }
    } catch (error) {
      console.error("Exception loading email stats:", error);
      setErrorCount((n) => Math.min(n + 1, 5));
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Initial load
  useEffect(() => {
    loadStats();
  }, []);

  // Auto-refresh with jitter and tab visibility handling
  useEffect(() => {
    let timer: number | undefined;

    function scheduleNext() {
      // Add jitter: 30s ±3s to prevent thundering herd
      const jitterMs = 30000 + Math.floor(Math.random() * 6000) - 3000;
      
      timer = window.setTimeout(async () => {
        // Only refresh if tab is visible
        if (!document.hidden) {
          await loadStats();
        }
        scheduleNext();
      }, jitterMs);
    }

    scheduleNext();

    // Refresh when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStats();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No email data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Statistics by Template
            </CardTitle>
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Connection Issues
              </Badge>
            )}
          </div>
          <Button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats.map((template) => (
          <div key={template.template_code} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{template.template_code}</h3>
              <span className="text-sm text-muted-foreground">
                {template.total_enqueued} total
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Send className="h-3.5 w-3.5" />
                  <span>Sent</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{template.total_sent}</span>
                  <span className="text-xs text-muted-foreground">
                    {calculatePercentage(template.total_sent, template.total_enqueued)}%
                  </span>
                </div>
                <Progress value={calculatePercentage(template.total_sent, template.total_enqueued)} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Delivered</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{template.delivered}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.delivery_rate_pct}%
                  </span>
                </div>
                <Progress value={template.delivery_rate_pct} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Opens</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{template.opened}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.open_rate_pct}%
                  </span>
                </div>
                <Progress value={template.open_rate_pct} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  <span>Clicks</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{template.clicked}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.click_rate_pct}%
                  </span>
                </div>
                <Progress value={template.click_rate_pct} className="h-1.5" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Bounces</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{template.bounced}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.bounce_rate_pct}%
                  </span>
                </div>
                <Progress value={template.bounce_rate_pct} className="h-1.5" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
