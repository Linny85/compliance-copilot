import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, TrendingUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatScore, getScoreColor, FRAMEWORK_CODES } from "@/lib/compliance/score";
import { useComplianceData, toPct, toUnit, clampPct } from "@/hooks/useCompliance";
import { useOverallCompliance } from "@/hooks/useOverallCompliance";
import { useTrainingCoverage } from "@/hooks/useTrainingCoverage";
import { useTenantStore } from "@/store/tenant";
import { toast } from "sonner";

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
  const { tenantId } = useTenantStore();
  
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

  // Tenant check: ensure tenant_id is set
  if (!tenantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t('dashboard:complianceProgress')}
          </CardTitle>
          <CardDescription className="text-destructive">
            {t('dashboard:noTenantSelected', 'Kein Mandant gewählt. Bitte wählen Sie einen Mandanten aus.')}
          </CardDescription>
        </CardHeader>
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
  
  // ✅ Primary source: overall_score from view (already 0..1)
  // Fallback: weighted calculation from components (same weights as view)
  const overallPercent = toPct(
    typeof summary?.overall_score === 'number'
      ? summary.overall_score  // 0..1 → % via toPct
      : (() => {
          const c = toUnit(summary?.controls_score);
          const e = toUnit(summary?.evidence_score);
          const t = toUnit(summary?.training_score);
          const d = toUnit(summary?.dpia_score);
          const weighted = (c * 0.5 + e * 0.2 + t * 0.1 + d * 0.2);
          return weighted;  // 0..1 → % via toPct
        })()
  );
  
  const displayOverall = clampPct(overallPercent);
  const overall = displayOverall / 100;
  const scoreVariant = getScoreColor(overall);
  
  // Calculate delta in percentage points
  const deltaPP = typeof trend?.delta_score === 'number' ? Math.round(trend.delta_score * 100) : null;
  
  // Unified percentage calculations for all breakdown bars (0..100)
  const controlsPct = toPct(summary?.controls_score);
  const evidencePct = toPct(summary?.evidence_score);
  const trainingPct = toPct(summary?.training_score);
  const dpiaPct = toPct(summary?.dpia_score);
  
  // DPIA display logic
  const dpiaTotal = Number(summary?.dpia_total ?? 0);
  const showDpia = dpiaTotal >= 1;
  const dpiaDisplay = showDpia ? `${dpiaPct}%` : t('common:badges.na');
  
  // Evidence display - show "—" if score is exactly 0 (no data)
  const evidenceDisplay = (evidencePct === 0 && summary?.evidence_score === 0)
    ? '—' 
    : `${evidencePct}%`;
  
  // Debug values in dev mode
  if (import.meta.env.DEV) {
    console.table({
      '⚠️ DATA SOURCE CHECK': '---',
      'overall_display': `${displayOverall}%`,
      'nis2_chip': `${nis2Pct}%`,
      'ai_chip': `${aiPct}%`,
      'gdpr_chip': `${gdprPct}%`,
      'controls_pct': `${controlsPct}%`,
      'evidence_pct': `${evidencePct}%`,
      'training_pct': `${trainingPct}%`,
      'dpia_pct': `${dpiaPct}%`,
      'dpia_total': dpiaTotal,
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
              <span className="text-3xl font-bold" data-testid="overall-pct">
                {displayOverall}%
              </span>
              <span 
                className="text-xs text-muted-foreground" 
                title={t('dashboard:complianceOverallTooltipWithTraining')}
              >
                {t('dashboard:complianceOverall')}
              </span>
              {/* debug removed */}
            </div>
          </div>

          {/* Framework Badges - Core Frameworks */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant={getBadgeVariant(nis2Pct)} data-testid="nis2-pct">
              {t('dashboard:labels.nis2')}: {nis2Pct}%
            </Badge>
            <Badge variant={getBadgeVariant(aiPct)} data-testid="ai-pct">
              {t('dashboard:labels.ai_act')}: {aiPct}%
            </Badge>
            <Badge variant={getBadgeVariant(gdprPct)} data-testid="gdpr-pct">
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
              <span className="font-medium">{controlsPct}%</span>
            </div>
            <Progress value={controlsPct} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('dashboard:sections.evidence')}
              </span>
              <span className="font-medium">{evidenceDisplay}</span>
            </div>
            <Progress value={evidencePct} />
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
              <span className="font-medium" title={!showDpia ? t('common:tooltips.dpia_na') : undefined}>
                {dpiaDisplay}
              </span>
            </div>
            <Progress value={showDpia ? dpiaPct : 0} />
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
