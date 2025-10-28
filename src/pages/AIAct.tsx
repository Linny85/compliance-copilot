import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus, Brain } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useI18n } from "@/contexts/I18nContext";

interface AISystem {
  id: string;
  name: string;
  description: string;
  risk_classification: string;
  purpose: string;
  deployment_status: string;
  created_at: string;
}

const AIAct = () => {
  const navigate = useNavigate();
  const { t, i18n, ready } = useTranslation(['aiAct', 'common']);
  const { tx } = useI18n();
  const [loading, setLoading] = useState(true);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newSystem, setNewSystem] = useState({
    name: "",
    description: "",
    risk_classification: "minimal",
    purpose: "",
    deployment_status: "planned",
  });

  useEffect(() => {
    loadData();
    // Ensure namespace is loaded
    const lng = i18n.language?.slice(0, 2) || 'de';
    if (!i18n.hasResourceBundle(lng, 'aiAct')) {
      i18n.loadNamespaces(['aiAct']).catch(console.error);
    }
  }, [navigate, i18n]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
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

    const { data: systemsData } = await supabase
      .from("ai_systems")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    setSystems(systemsData || []);
    setLoading(false);
  };

  const handleCreateSystem = async () => {
    if (!companyId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("ai_systems")
      .insert({
        ...newSystem,
        company_id: companyId,
        created_by: user?.id,
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("AI system registered successfully");
    setDialogOpen(false);
    setNewSystem({
      name: "",
      description: "",
      risk_classification: "minimal",
      purpose: "",
      deployment_status: "planned",
    });
    loadData();
  };

  const getRiskColor = (classification: string) => {
    switch (classification) {
      case "minimal": return "bg-accent";
      case "limited": return "bg-warning";
      case "high": return "bg-destructive";
      case "unacceptable": return "bg-destructive";
      default: return "bg-secondary";
    }
  };

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
            <header className="text-center space-y-2">
              <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                {t('aiAct:title')}
              </h1>
              <p className="text-muted-foreground">{t('aiAct:subtitle')}</p>
              <div className="mt-3 flex justify-center">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('aiAct:actions.register')}
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('aiAct:dialog.title')}</DialogTitle>
                    <DialogDescription>
                      {t('aiAct:dialog.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">System Name *</Label>
                      <Input
                        id="name"
                        value={newSystem.name}
                        onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                        placeholder="Customer Service Chatbot"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newSystem.description}
                        onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                        placeholder="Detailed description of the AI system..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purpose">Purpose</Label>
                      <Textarea
                        id="purpose"
                        value={newSystem.purpose}
                        onChange={(e) => setNewSystem({ ...newSystem, purpose: e.target.value })}
                        placeholder="Business purpose and use case..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="risk">Risk Classification</Label>
                        <Select
                          value={newSystem.risk_classification}
                          onValueChange={(value) => setNewSystem({ ...newSystem, risk_classification: value })}
                        >
                          <SelectTrigger id="risk">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">Minimal Risk</SelectItem>
                            <SelectItem value="limited">Limited Risk</SelectItem>
                            <SelectItem value="high">High Risk</SelectItem>
                            <SelectItem value="unacceptable">Unacceptable Risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deployment">Deployment Status</Label>
                        <Select
                          value={newSystem.deployment_status}
                          onValueChange={(value) => setNewSystem({ ...newSystem, deployment_status: value })}
                        >
                          <SelectTrigger id="deployment">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="development">Development</SelectItem>
                            <SelectItem value="deployed">Deployed</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      {t('aiAct:actions.cancel')}
                    </Button>
                    <Button onClick={handleCreateSystem} disabled={!newSystem.name}>
                      {t('aiAct:actions.register')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </header>

            {systems.length === 0 ? (
              <section className="mt-6">
                <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 sm:p-8 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">{t('aiAct:empty.title')}</h2>
                  <p className="text-muted-foreground mb-4">
                    {t('aiAct:empty.description')}
                  </p>
                  <div className="flex justify-center">
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('aiAct:empty.button')}
                    </Button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mt-6">
                <div className="grid gap-4">
                  {systems.map((system) => (
                  <Card key={system.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {system.name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {system.description}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getRiskColor(system.risk_classification)}>
                            {system.risk_classification}
                          </Badge>
                          <Badge variant="outline">
                            {system.deployment_status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    {system.purpose && (
                      <CardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Purpose:</h4>
                          <p className="text-sm text-muted-foreground">{system.purpose}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AIAct;
