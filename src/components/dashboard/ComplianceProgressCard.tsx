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

export function ComplianceProgressCard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { loading, summary, trend, getFrameworkScorePct, isAdmin, refreshSummary, refreshing } = useComplianceData();

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

  const overall = summary.overall_score ?? 0;
  const overallPercent = Math.round(overall * 100);
  const scoreVariant = getScoreColor(overall);
  
  // Calculate delta in percentage points
  const deltaPP = typeof trend?.delta_score === 'number' ? Math.round(trend.delta_score * 100) : null;
  
  // DPIA should only show percentage if there are at least 2 cases
  const dpiaTotal = summary.dpia_total ?? 0;
  const dpiaScore = summary.dpia_score ?? 0;
  const showDpia = dpiaTotal > 1;
  const dpiaDisplay = showDpia ? formatScore(dpiaScore) : t('dashboard:badges.na');
  
  // Debug DPIA values in dev mode
  if (import.meta.env.DEV) {
    console.debug('[dashboard:dsfa]', {
      dpia_total: dpiaTotal,
      dpia_pct: dpiaScore,
      showDpia
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
            <Badge variant={getBadgeVariant(getFrameworkScorePct(FRAMEWORK_CODES.NIS2))}>
              {t('dashboard:labels.nis2')}: {getFrameworkScorePct(FRAMEWORK_CODES.NIS2)}%
            </Badge>
            <Badge variant={getBadgeVariant(getFrameworkScorePct(FRAMEWORK_CODES.AI_ACT))}>
              {t('dashboard:labels.ai_act')}: {getFrameworkScorePct(FRAMEWORK_CODES.AI_ACT)}%
            </Badge>
            <Badge variant={getBadgeVariant(getFrameworkScorePct(FRAMEWORK_CODES.GDPR))}>
              {t('dashboard:labels.gdpr')}: {getFrameworkScorePct(FRAMEWORK_CODES.GDPR)}%
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
