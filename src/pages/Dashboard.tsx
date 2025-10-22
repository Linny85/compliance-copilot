import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Brain, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRisks: 0,
    criticalRisks: 0,
    aiSystems: 0,
    complianceScore: 75,
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, companies(name)")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        navigate("/onboarding");
        return;
      }

      // @ts-ignore - Type issue with nested select
      setCompanyName(profile.companies?.name || "Your Company");

      // Load stats
      const [risksResult, aiSystemsResult] = await Promise.all([
        supabase.from("nis2_risks").select("*", { count: "exact" }).eq("company_id", profile.company_id),
        supabase.from("ai_systems").select("*", { count: "exact" }).eq("company_id", profile.company_id),
      ]);

      const criticalRisks = risksResult.data?.filter(r => r.risk_level === "critical").length || 0;

      setStats({
        totalRisks: risksResult.count || 0,
        criticalRisks,
        aiSystems: aiSystemsResult.count || 0,
        complianceScore: 75, // Calculate based on actual data
      });

      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
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
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold">{companyName}</h1>
              <p className="text-muted-foreground">Compliance Dashboard</p>
            </div>

            {/* Compliance Score */}
            <Card className="bg-gradient-card">
              <CardHeader>
                <CardTitle>Overall Compliance Score</CardTitle>
                <CardDescription>Based on NIS2 and AI Act requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Compliance Level</span>
                    <span className="font-semibold">{stats.complianceScore}%</span>
                  </div>
                  <Progress value={stats.complianceScore} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRisks}</div>
                  <p className="text-xs text-muted-foreground">NIS2 Risk Items</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Risks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.criticalRisks}</div>
                  <p className="text-xs text-muted-foreground">Require immediate attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Systems</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.aiSystems}</div>
                  <p className="text-xs text-muted-foreground">Registered systems</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">Active</div>
                  <p className="text-xs text-muted-foreground">Trial period</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common compliance tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate("/nis2")}
                  className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <Shield className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold">Add NIS2 Risk</h3>
                  <p className="text-sm text-muted-foreground">Document new cybersecurity risk</p>
                </button>

                <button
                  onClick={() => navigate("/ai-act")}
                  className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <Brain className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold">Register AI System</h3>
                  <p className="text-sm text-muted-foreground">Add new AI system to registry</p>
                </button>

                <button
                  onClick={() => navigate("/documents")}
                  className="p-4 border rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <CheckCircle2 className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold">Generate Report</h3>
                  <p className="text-sm text-muted-foreground">Create compliance documentation</p>
                </button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
