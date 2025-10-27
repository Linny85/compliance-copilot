import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Calendar, Building2, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function NextStepsCard() {
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'common']);
  const [counts, setCounts] = useState({ evidence: 0, checks: 0 });

  useEffect(() => {
    const loadCounts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (profile?.company_id) {
        const [ev, ch] = await Promise.all([
          supabase.from('evidence_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.company_id).eq('status', 'open'),
          supabase.from('check_rules').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.company_id),
        ]);
        setCounts({ evidence: ev.count ?? 0, checks: ch.count ?? 0 });
      }
    };
    loadCounts();
  }, []);

  const steps = [
    { icon: Upload, title: t('dashboard:uploadEvidence'), desc: t('dashboard:uploadEvidenceDesc'), action: () => navigate("/evidence"), show: counts.evidence > 0 },
    { icon: Calendar, title: t('dashboard:scheduleChecks'), desc: t('dashboard:scheduleChecksDesc'), action: () => navigate("/checks"), show: counts.checks < 5 },
    { icon: Building2, title: t('dashboard:addRisks'), desc: t('dashboard:addRisksDesc'), action: () => navigate("/nis2"), show: true },
    { icon: FileText, title: t('dashboard:generatePolicy'), desc: t('dashboard:generatePolicyDesc'), action: () => navigate("/documents"), show: true },
  ].filter(s => s.show).slice(0, 3);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('dashboard:nextStepsHeader')}</CardTitle>
        <CardDescription>{t('dashboard:nextStepsSub')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Button 
              key={i} 
              variant="outline" 
              className="w-full justify-start h-auto py-4 px-4" 
              onClick={step.action}
            >
              <div className="flex items-start gap-3 w-full min-w-0">
                <div className="shrink-0 mt-0.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold leading-tight text-balance break-words hyphens-auto line-clamp-2">
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug text-pretty break-words hyphens-auto line-clamp-2 mt-0.5">
                    {step.desc}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
