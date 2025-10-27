import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Send, CheckCircle2, Eye, MousePointerClick, XCircle, Ban } from "lucide-react";

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

  async function loadStats() {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_email_stats")
      .select("*")
      .order("total_enqueued", { ascending: false });

    if (error) {
      console.error("Failed to load email stats:", error);
      setLoading(false);
      return;
    }

    setStats(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
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
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Statistics by Template
        </CardTitle>
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
