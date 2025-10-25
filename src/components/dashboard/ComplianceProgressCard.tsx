import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatScore, getScoreColor, FRAMEWORK_CODES } from "@/lib/compliance/score";
import { useComplianceData } from "@/hooks/useCompliance";

export function ComplianceProgressCard() {
  const { t } = useTranslation(['common']);
  const { loading, summary, getFrameworkScorePct } = useComplianceData();

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
            {t('compliance.progress', 'Compliance Progress')}
          </CardTitle>
          <CardDescription>
            {t('compliance.noData', 'No compliance data available yet. Complete checks, upload evidence, and complete DPIAs to see your progress.')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const overall = summary.overall_score ?? 0;
  const overallPercent = Math.round(overall * 100);
  const scoreVariant = getScoreColor(overall);
  
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('compliance.progress', 'Compliance Progress')}
        </CardTitle>
        <CardDescription>
          {t('compliance.overall', 'Overall compliance status and framework breakdown')}
        </CardDescription>
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
              {t('compliance.framework.nis2', 'NIS2')}: {getFrameworkScorePct(FRAMEWORK_CODES.NIS2)}%
            </Badge>
            <Badge variant={getBadgeVariant(getFrameworkScorePct(FRAMEWORK_CODES.AI_ACT))}>
              {t('compliance.framework.ai_act', 'AI Act')}: {getFrameworkScorePct(FRAMEWORK_CODES.AI_ACT)}%
            </Badge>
            <Badge variant={getBadgeVariant(getFrameworkScorePct(FRAMEWORK_CODES.GDPR))}>
              {t('compliance.framework.gdpr', 'GDPR')}: {getFrameworkScorePct(FRAMEWORK_CODES.GDPR)}%
            </Badge>
          </div>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('compliance.breakdown.controls', 'Controls')}
              </span>
              <span className="font-medium">{formatScore(summary.controls_score ?? 0)}</span>
            </div>
            <Progress value={(summary.controls_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('compliance.breakdown.evidence', 'Evidence')}
              </span>
              <span className="font-medium">{formatScore(summary.evidence_score ?? 0)}</span>
            </div>
            <Progress value={(summary.evidence_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('compliance.breakdown.training', 'Training')}
              </span>
              <span className="font-medium">{formatScore(summary.training_score ?? 0)}</span>
            </div>
            <Progress value={(summary.training_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('compliance.breakdown.dpia', 'Data Protection')}
              </span>
              <span className="font-medium">{formatScore(summary.dpia_score ?? 0)}</span>
            </div>
            <Progress value={(summary.dpia_score ?? 0) * 100} />
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-center gap-2 p-4 text-sm border-t">
          {scoreVariant === 'success' && (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-success">Excellent compliance status</span>
            </>
          )}
          {scoreVariant === 'warning' && (
            <>
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-warning">Good progress, continue improving</span>
            </>
          )}
          {scoreVariant === 'destructive' && (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Needs attention</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
