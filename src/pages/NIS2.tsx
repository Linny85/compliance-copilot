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
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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

    toast.success("Risk created successfully");
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
          <p className="mt-4 text-muted-foreground">Loading risks...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-primary" />
                  NIS2 Risk Management
                </h1>
                <p className="text-muted-foreground">Track and manage cybersecurity risks</p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Risk
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Risk</DialogTitle>
                    <DialogDescription>
                      Document a new NIS2 cybersecurity risk
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Risk Title *</Label>
                      <Input
                        id="title"
                        value={newRisk.title}
                        onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                        placeholder="Unauthorized access to critical systems"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newRisk.description}
                        onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                        placeholder="Detailed description of the risk..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="risk-level">Risk Level</Label>
                        <Select
                          value={newRisk.risk_level}
                          onValueChange={(value) => setNewRisk({ ...newRisk, risk_level: value })}
                        >
                          <SelectTrigger id="risk-level">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={newRisk.status}
                          onValueChange={(value) => setNewRisk({ ...newRisk, status: value })}
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="mitigated">Mitigated</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mitigation">Mitigation Plan</Label>
                      <Textarea
                        id="mitigation"
                        value={newRisk.mitigation_plan}
                        onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                        placeholder="Steps to mitigate this risk..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRisk} disabled={!newRisk.title}>
                      Create Risk
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {risks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No risks documented</h3>
                  <p className="text-muted-foreground mb-4">
                    Start managing your cybersecurity risks by creating your first risk entry
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Risk
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
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
                            {risk.risk_level}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(risk.status)}>
                            {risk.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    {risk.mitigation_plan && (
                      <CardContent>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Mitigation Plan:</h4>
                          <p className="text-sm text-muted-foreground">{risk.mitigation_plan}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default NIS2;
