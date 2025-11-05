import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, TrendingUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatScore, getScoreColor, FRAMEWORK_CODES } from "@/lib/compliance/score";
import { useComplianceData } from "@/hooks/useCompliance";
import { toast } from "sonner";

// Helper to normalize percentage values (0..1 or 0..100 -> 0..100)
function normPct(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

// Helper to extract framework score from frameworks array
function pickFrameworkScore(frameworks: any[] | undefined, code: string): number {
  if (!Array.isArray(frameworks)) return 0;
  const found = frameworks.find((x) => {
    const k = String(x?.framework ?? x?.framework_code ?? x?.code ?? '').toUpperCase();
    return k === code.toUpperCase();
  });
  const raw = found?.score ?? found?.pct ?? found?.percentage ?? 0;
  return Math.max(0, Math.min(100, normPct(raw)));
}

export function ComplianceProgressCard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { loading, summary, frameworks, trend, isAdmin, refreshSummary, refreshing } = useComplianceData();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <div className="flex gap-2 justify-center">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('dashboard:complianceProgress')}
          </CardTitle>
          <CardDescription>
            {t('dashboard:complianceProgressDesc')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Overall score
  const overall = summary.overall_score ?? 0;
  const overallPercent = Math.round(overall * 100);
  const scoreVariant = getScoreColor(overall);
  
  // Calculate delta in percentage points
  const deltaPP = typeof trend?.delta_score === 'number' ? Math.round(trend.delta_score * 100) : null;
  
  // Framework scores from frameworks array
  const nis2Pct = pickFrameworkScore(frameworks, FRAMEWORK_CODES.NIS2);
  const aiPct = pickFrameworkScore(frameworks, FRAMEWORK_CODES.AI_ACT);
  const gdprPct = pickFrameworkScore(frameworks, FRAMEWORK_CODES.GDPR);
  
  // DPIA should only show percentage if there are at least 2 cases
  const dpiaTotal = summary.dpia_total ?? 0;
  const dpiaScore = summary.dpia_score ?? 0;
  const showDpia = dpiaTotal > 1;
  const dpiaDisplay = showDpia ? formatScore(dpiaScore) : t('dashboard:badges.na');
  
  // Debug values in dev mode
  if (import.meta.env.DEV) {
    console.debug('[dashboard:progress]', {
      overall: overallPercent,
      frameworks: { nis2: nis2Pct, ai: aiPct, gdpr: gdprPct },
      dpia: { total: dpiaTotal, score: dpiaScore, showDpia }
    });
  }
  
  const getCircleColor = (score: number) => {
    if (score >= 0.80) return "hsl(var(--success))";
    if (score >= 0.50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const handleRefresh = async () => {
    try {
      await refreshSummary();
      toast.success(t('dashboard:complianceRefreshSuccess'));
    } catch (error) {
      toast.error(t('dashboard:complianceRefreshError'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 flex-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('dashboard:complianceProgress')}
              {deltaPP !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  deltaPP >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                }`}>
                  {deltaPP >= 0 ? '▲' : '▼'} {Math.abs(deltaPP)}pp
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {t('dashboard:complianceOverallDesc')}
            </CardDescription>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score Circle */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={getCircleColor(overall)}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - overall)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{overallPercent}%</span>
              <span className="text-xs text-muted-foreground">Overall</span>
            </div>
          </div>

          {/* Framework Badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant={getBadgeVariant(nis2Pct)}>
              {t('dashboard:labels.nis2')}: {nis2Pct}%
            </Badge>
            <Badge variant={getBadgeVariant(aiPct)}>
              {t('dashboard:labels.ai_act')}: {aiPct}%
            </Badge>
            <Badge variant={getBadgeVariant(gdprPct)}>
              {t('dashboard:labels.gdpr')}: {gdprPct}%
            </Badge>
          </div>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard:sections.controls')}
              </span>
              <span className="font-medium">{formatScore(summary.controls_score ?? 0)}</span>
            </div>
            <Progress value={(summary.controls_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard:sections.evidence')}
              </span>
              <span className="font-medium">{formatScore(summary.evidence_score ?? 0)}</span>
            </div>
            <Progress value={(summary.evidence_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard:sections.trainings')}
              </span>
              <span className="font-medium">{formatScore(summary.training_score ?? 0)}</span>
            </div>
            <Progress value={(summary.training_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard:sections.dpia')}
              </span>
              <span className="font-medium" title={!showDpia ? t('dashboard:tooltips.dpia_na') : undefined}>
                {dpiaDisplay}
              </span>
            </div>
            <Progress value={showDpia ? (summary.dpia_score ?? 0) * 100 : 0} />
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-center gap-2 p-4 text-sm border-t">
          {scoreVariant === 'success' && (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-success">{t('dashboard:complianceStatusExcellent')}</span>
            </>
          )}
          {scoreVariant === 'warning' && (
            <>
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-warning">{t('dashboard:complianceStatusGood')}</span>
            </>
          )}
          {scoreVariant === 'destructive' && (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{t('dashboard:complianceStatusNeeds')}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
