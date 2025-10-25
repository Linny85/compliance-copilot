import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatScore, getScoreColor } from "@/lib/compliance/score";

interface ComplianceData {
  overall_score: number;
  controls_score: number;
  evidence_score: number;
  training_score: number;
  dpia_score: number;
}

interface FrameworkScore {
  framework: string;
  score: number;
}

interface OpenTask {
  title: string;
  due_at: string | null;
  link: string;
  severity: string;
  type: string;
}

export function ComplianceProgressCard() {
  const { t } = useTranslation(['common']);
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [frameworkScores, setFrameworkScores] = useState<FrameworkScore[]>([]);
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([]);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Calculate scores manually for now (until views are populated)
      
      // 1. Controls score - from check results
      const { data: checkResults } = await supabase
        .from("check_results")
        .select("outcome")
        .eq("tenant_id", profile.company_id);

      const controlsScore = checkResults && checkResults.length > 0
        ? checkResults.filter(r => r.outcome === 'pass').length / checkResults.length
        : 0;

      // 2. Evidence score - from evidences
      const { data: evidences } = await supabase
        .from("evidences")
        .select("verdict")
        .eq("tenant_id", profile.company_id);

      const evidenceScore = evidences && evidences.length > 0
        ? evidences.filter(e => e.verdict === 'approved').length / evidences.length
        : 0;

      // 3. Training score - from training certificates
      const { data: trainings } = await supabase
        .from("training_certificates")
        .select("status")
        .eq("tenant_id", profile.company_id);

      const { data: users } = await supabase
        .from("profiles")
        .select("id", { count: 'exact', head: true })
        .eq("company_id", profile.company_id);

      const trainingScore = users && (users as any) > 0 && trainings
        ? trainings.filter(t => t.status === 'verified').length / (users as any)
        : 0;

      // 4. DPIA score - from dpia records
      const { data: dpias } = await supabase
        .from("dpia_records")
        .select("status")
        .eq("tenant_id", profile.company_id);

      const dpiaScore = dpias && dpias.length > 0
        ? dpias.filter(d => d.status === 'approved' || d.status === 'completed').length / dpias.length
        : 0;

      // Calculate overall score (weights: controls=50%, evidence=20%, training=10%, dpia=20%)
      const overallScore = (
        controlsScore * 0.50 +
        evidenceScore * 0.20 +
        trainingScore * 0.10 +
        dpiaScore * 0.20
      );

      setCompliance({
        overall_score: overallScore,
        controls_score: controlsScore,
        evidence_score: evidenceScore,
        training_score: trainingScore,
        dpia_score: dpiaScore
      });

      // For now, set dummy framework scores (will be replaced with real data)
      setFrameworkScores([
        { framework: 'NIS2', score: controlsScore },
        { framework: 'AI_ACT', score: controlsScore * 0.9 },
        { framework: 'GDPR', score: dpiaScore }
      ]);

      // Load open tasks
      const tasks: OpenTask[] = [];

      // Failed checks
      const { data: failedChecks } = await supabase
        .from("check_results")
        .select("message, created_at")
        .eq("tenant_id", profile.company_id)
        .eq("outcome", "fail")
        .order("created_at", { ascending: false })
        .limit(2);

      if (failedChecks) {
        tasks.push(...failedChecks.map(c => ({
          title: c.message || "Failed check",
          due_at: null,
          link: "/checks",
          severity: "high",
          type: "check"
        })));
      }

      // Pending evidence requests
      const { data: evidenceRequests } = await supabase
        .from("evidence_requests")
        .select("title, due_at")
        .eq("tenant_id", profile.company_id)
        .eq("status", "open")
        .order("due_at", { ascending: true })
        .limit(1);

      if (evidenceRequests && evidenceRequests.length > 0) {
        tasks.push({
          title: evidenceRequests[0].title,
          due_at: evidenceRequests[0].due_at,
          link: "/evidence",
          severity: "high",
          type: "evidence"
        });
      }

      setOpenTasks(tasks.slice(0, 3));
    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!compliance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('compliance.progress')}
          </CardTitle>
          <CardDescription>{t('compliance.noData')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const overallPercent = Math.round(compliance.overall_score * 100);
  const scoreColor = getScoreColor(compliance.overall_score);
  
  const getCircleColor = (score: number) => {
    if (score >= 0.80) return "hsl(var(--success))";
    if (score >= 0.50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getFrameworkScore = (framework: string) => {
    const score = frameworkScores.find(f => f.framework === framework);
    return score ? Math.round(score.score * 100) : 0;
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
          Compliance Progress
        </CardTitle>
        <CardDescription>
          Overall compliance status and framework breakdown
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
                stroke={getCircleColor(compliance.overall_score)}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - compliance.overall_score)}`}
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
            <Badge variant={getBadgeVariant(getFrameworkScore('NIS2'))}>
              NIS2: {getFrameworkScore('NIS2')}%
            </Badge>
            <Badge variant={getBadgeVariant(getFrameworkScore('AI_ACT'))}>
              AI Act: {getFrameworkScore('AI_ACT')}%
            </Badge>
            <Badge variant={getBadgeVariant(getFrameworkScore('GDPR'))}>
              GDPR: {getFrameworkScore('GDPR')}%
            </Badge>
          </div>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Controls</span>
              <span className="font-medium">{formatScore(compliance.controls_score)}</span>
            </div>
            <Progress value={compliance.controls_score * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Evidence</span>
              <span className="font-medium">{formatScore(compliance.evidence_score)}</span>
            </div>
            <Progress value={compliance.evidence_score * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Training</span>
              <span className="font-medium">{formatScore(compliance.training_score)}</span>
            </div>
            <Progress value={compliance.training_score * 100} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">DPIA</span>
              <span className="font-medium">{formatScore(compliance.dpia_score)}</span>
            </div>
            <Progress value={compliance.dpia_score * 100} />
          </div>
        </div>

        {/* Open Tasks */}
        {openTasks.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Top Priorities
            </h4>
            <div className="space-y-2">
              {openTasks.map((task, idx) => (
                <a
                  key={idx}
                  href={task.link}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors text-sm"
                >
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.title}</div>
                    {task.due_at && (
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(task.due_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {openTasks.length === 0 && (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>All tasks up to date</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
