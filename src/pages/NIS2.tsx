import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { isDemo } from "@/config/appMode";

interface Risk {
  id: string;
  title: string;
  description: string;
  risk_level: string;
  status: string;
  mitigation_plan: string;
  created_at: string;
}

const NIS2 = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newRisk, setNewRisk] = useState({
    title: "",
    description: "",
    risk_level: "medium",
    status: "open",
    mitigation_plan: "",
  });

  useEffect(() => {
    loadData();
  }, [navigate]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      if (isDemo()) { setLoading(false); return; }
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      navigate("/onboarding");
      return;
    }

    setCompanyId(profile.company_id);

    const { data: risksData } = await supabase
      .from("nis2_risks")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    setRisks(risksData || []);
    setLoading(false);
  };

  const handleCreateRisk = async () => {
    if (!companyId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("nis2_risks")
      .insert({
        ...newRisk,
        company_id: companyId,
        created_by: user?.id,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t.nis2.actions.create);
    setDialogOpen(false);
    setNewRisk({
      title: "",
      description: "",
      risk_level: "medium",
      status: "open",
      mitigation_plan: "",
    });
    loadData();
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low": return "bg-accent";
      case "medium": return "bg-warning";
      case "high": return "bg-destructive";
      case "critical": return "bg-destructive";
      default: return "bg-secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-destructive";
      case "in_progress": return "bg-warning";
      case "mitigated": return "bg-accent";
      case "closed": return "bg-muted";
      default: return "bg-secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-root" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <section className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-primary" />
            {t.nis2.title}
          </h1>
          <p className="text-muted-foreground max-w-2xl">{t.nis2.subtitle}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.nis2.addRisk}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.nis2.createTitle}</DialogTitle>
              <DialogDescription>
                {t.nis2.createDesc}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t.nis2.form.titleLabel}</Label>
                <Input
                  id="title"
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                  placeholder={t.nis2.form.titlePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t.nis2.form.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  value={newRisk.description}
                  onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                  placeholder={t.nis2.form.descriptionPlaceholder}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="risk-level">{t.nis2.form.riskLevelLabel}</Label>
                  <Select
                    value={newRisk.risk_level}
                    onValueChange={(value) => setNewRisk({ ...newRisk, risk_level: value })}
                  >
                    <SelectTrigger id="risk-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t.nis2.riskLevels.low}</SelectItem>
                      <SelectItem value="medium">{t.nis2.riskLevels.medium}</SelectItem>
                      <SelectItem value="high">{t.nis2.riskLevels.high}</SelectItem>
                      <SelectItem value="critical">{t.nis2.riskLevels.critical}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">{t.nis2.form.statusLabel}</Label>
                  <Select
                    value={newRisk.status}
                    onValueChange={(value) => setNewRisk({ ...newRisk, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t.nis2.statuses.open}</SelectItem>
                      <SelectItem value="in_progress">{t.nis2.statuses.in_progress}</SelectItem>
                      <SelectItem value="mitigated">{t.nis2.statuses.mitigated}</SelectItem>
                      <SelectItem value="closed">{t.nis2.statuses.closed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mitigation">{t.nis2.form.mitigationPlanLabel}</Label>
                <Textarea
                  id="mitigation"
                  value={newRisk.mitigation_plan}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                  placeholder={t.nis2.form.mitigationPlanPlaceholder}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleCreateRisk} disabled={!newRisk.title}>
                {t.nis2.actions.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {risks.length === 0 ? (
        <section className="flex items-center justify-center py-10">
          <Card data-testid="empty-state" className="w-full max-w-xl">
            <CardContent className="p-8 sm:p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t.nis2.empty.title}</h3>
              <p className="text-muted-foreground mb-4">
                {t.nis2.empty.desc}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.nis2.empty.cta}
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid gap-4">
          {risks.map((risk) => (
            <Card key={risk.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {risk.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {risk.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getRiskLevelColor(risk.risk_level)}>
                      {t.nis2.riskLevels[risk.risk_level] || risk.risk_level}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(risk.status)}>
                      {t.nis2.statuses[risk.status] || risk.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {risk.mitigation_plan && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{t.nis2.sections.mitigationPlan}</h4>
                    <p className="text-sm text-muted-foreground">{risk.mitigation_plan}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

export default NIS2;
