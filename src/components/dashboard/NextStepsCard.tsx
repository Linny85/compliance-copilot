import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Calendar, Building2, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function NextStepsCard() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'dashboard']);
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
    { icon: Upload, title: "Upload Evidence", desc: "Complete evidence requests", action: () => navigate("/evidence"), show: counts.evidence > 0 },
    { icon: Calendar, title: "Schedule Checks", desc: "Set up automated checks", action: () => navigate("/checks"), show: counts.checks < 5 },
    { icon: Building2, title: "Add Risks", desc: "Document NIS2 risks", action: () => navigate("/nis2"), show: true },
    { icon: FileText, title: "Generate Policies", desc: "Create documentation", action: () => navigate("/documents"), show: true },
  ].filter(s => s.show).slice(0, 3);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Next Steps</CardTitle>
        <CardDescription>Quick actions to improve compliance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Button key={i} variant="outline" className="w-full justify-start h-auto py-4 px-4" onClick={step.action}>
              <Icon className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left flex-1">
                <div className="font-semibold">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.desc}</div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
