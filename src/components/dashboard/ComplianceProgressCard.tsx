import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, TrendingUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatScore, getScoreColor, FRAMEWORK_CODES } from "@/lib/compliance/score";
import { calcOverall } from "@/lib/compliance/overall";
import { useComplianceData } from "@/hooks/useCompliance";
import { useOverallCompliance } from "@/hooks/useOverallCompliance";
import { useTrainingCoverage } from "@/hooks/useTrainingCoverage";
import { toast } from "sonner";

// Helper to normalize percentage values (0..1 or 0..100 -> 0..100)
function normPct(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

  // Extract framework score from normalized view (always 0..1)
  function pickFrameworkScore(frameworks: any[] | undefined, code: string): number | null {
    if (!Array.isArray(frameworks)) return null;
    const f = frameworks.find(x =>
      String(x?.framework_code ?? x?.code ?? '').toUpperCase() === code.toUpperCase()
    );
    if (!f) return null;
    const raw = Number(f?.score);
    if (!Number.isFinite(raw)) return null;
    // View returns 0..1, convert to percentage
    return Math.round(raw * 100);
  }

export function ComplianceProgressCard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { loading, summary, frameworks, trend, isAdmin, refreshSummary, refreshing } = useComplianceData();
  
  // CRITICAL: All hooks must be called before any early returns
  const { overall: overallFromHook } = useOverallCompliance(summary);
  const training = useTrainingCoverage(summary);

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

  // Framework scores from frameworks array - default to 0 for missing data
  const nis2Pct = pickFrameworkScore(frameworks, 'NIS2') ?? 0;
  const aiPct   = pickFrameworkScore(frameworks, 'AI_ACT') ?? 0;
  const gdprPct = pickFrameworkScore(frameworks, 'GDPR') ?? 0;
  
  // Use computed overall from all available framework scores
  const computedOverallPct = calcOverall([
    { key: 'nis2', score: nis2Pct },
    { key: 'ai_act', score: aiPct },
    { key: 'gdpr', score: gdprPct },
  ]);
  
  // Prefer computed overall if available, otherwise default to 0
  const overallPercent = computedOverallPct ?? 0;
  
  const overall = overallPercent != null ? overallPercent / 100 : 0;
  const scoreVariant = getScoreColor(overall);
  
  // Calculate delta in percentage points
  const deltaPP = typeof trend?.delta_score === 'number' ? Math.round(trend.delta_score * 100) : null;
  
  // DPIA should show percentage from >=1 case onwards
  const dpiaTotal = Number(summary?.dpia_total ?? 0);
  const dpiaScore = normPct(summary?.dpia_score);
  const showDpia  = dpiaTotal >= 1;
  const dpiaDisplay = showDpia ? formatScore(dpiaScore) : t('dashboard:badges.na');
  
  // Evidence display - show "—" if score is exactly 0 (no data)
  const evidenceScore = normPct(summary?.evidence_score);
  const evidenceDisplay = (evidenceScore === 0 && summary?.evidence_score === 0)
    ? '—' 
    : formatScore(summary.evidence_score ?? 0);
  
  // Debug values in dev mode
  if (import.meta.env.DEV) {
    console.table({
      '⚠️ DATA SOURCE CHECK': '---',
      'nis2_chip': `${nis2Pct}%`,
      'ai_chip': `${aiPct}%`,
      'gdpr_chip': `${gdprPct}%`,
      'tr_nis2': (summary as any)?.training_percent_nis2 ?? 'NULL',
      'tr_ai': (summary as any)?.training_percent_ai_act ?? 'NULL',
      'tr_gdpr': (summary as any)?.training_percent_gdpr ?? 'NULL',
      'overall_computed': `${computedOverallPct}%`,
      'overall_final': `${overallPercent}%`,
      'controls_pct': `${Math.round((summary.controls_score ?? 0) * 100)}%`,
      'evidence_score': summary?.evidence_score ?? 0,
      'dpia_score': summary?.dpia_score ?? 0,
      'frameworks_array_length': frameworks?.length ?? 0,
    });
    console.log('Frameworks raw data:', frameworks);
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
              <span className="text-3xl font-bold">
                {overallPercent}%
              </span>
              <span 
                className="text-xs text-muted-foreground" 
                title={t('dashboard:complianceOverallTooltipWithTraining')}
              >
                {t('dashboard:complianceOverall')}
              </span>
            </div>
          </div>

          {/* Framework Badges - Core Frameworks */}
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

          {/* Additional Frameworks */}
          {(() => {
            const coreFrameworks = new Set(['NIS2', 'AI_ACT', 'GDPR']);
            const additionalFrameworks = (frameworks ?? []).filter(f => {
              const code = String(f.framework_code ?? f.framework ?? '').toUpperCase();
              return code && !coreFrameworks.has(code);
            });
            
            if (additionalFrameworks.length === 0) return null;
            
            return (
              <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-border/50" data-testid="fw-extra">
                {additionalFrameworks.map(f => {
                  const code = String(f.framework_code ?? f.framework);
                  const fwScore = pickFrameworkScore([f], code) ?? 0;
                  return (
                    <Badge key={code} variant={getBadgeVariant(fwScore)}>
                      {code}: {fwScore}%
                    </Badge>
                  );
                })}
              </div>
            );
          })()}
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
              <span className="font-medium">{evidenceDisplay}</span>
            </div>
            <Progress value={(summary.evidence_score ?? 0) * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard:sections.trainings')}
              </span>
              <span className="font-medium" title={
                training.overall == null 
                  ? t('dashboard:training.missing_data')
                  : training.required.nis2 === 0 && training.required.aiAct === 0 && training.required.gdpr === 0
                  ? t('dashboard:training.no_requirements')
                  : t('dashboard:training.coverage_tooltip', {
                      participants: training.participantsTotal ?? 0,
                      required: (training.required.nis2 ?? 0) + (training.required.aiAct ?? 0) + (training.required.gdpr ?? 0)
                    })
              }>
                {training.overall == null ? '—' : `${training.overall}%`}
              </span>
            </div>
            <Progress value={training.overall ?? 0} />
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
