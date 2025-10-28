import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Settings, Plus, UserMinus, Clock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { QAMonitorCard } from "@/components/dashboard/QAMonitorCard";
import { ComplianceStatusCard } from "@/components/dashboard/ComplianceStatusCard";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { OpsDashboardCard } from "@/components/dashboard/OpsDashboardCard";
import { ForecastCard } from "@/components/dashboard/ForecastCard";
import GraphManager from "@/pages/admin/GraphManager";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Subscription {
  status: string;
  trial_start: string;
  trial_end: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member",
    masterCode: "",
  });

  const [removeForm, setRemoveForm] = useState({
    masterCode: "",
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

    // Load users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        user_roles(role)
      `)
      .eq("company_id", profile.company_id);

    const usersWithRoles = profilesData?.map(p => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name || p.email,
      // @ts-ignore
      role: p.user_roles?.[0]?.role || 'member'
    })) || [];

    setUsers(usersWithRoles);

    // Load subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", profile.company_id)
      .maybeSingle();

    setSubscription(subData);
    setLoading(false);
  };

  const handleInviteUser = async () => {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: inviteForm
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("User invited successfully");
    setInviteDialogOpen(false);
    setInviteForm({ email: "", role: "member", masterCode: "" });
    loadData();
  };

  const handleRemoveUser = async () => {
    if (!selectedUser) return;

    const { data, error } = await supabase.functions.invoke('remove-user', {
      body: {
        userId: selectedUser,
        masterCode: removeForm.masterCode
      }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("User removed successfully");
    setRemoveDialogOpen(false);
    setRemoveForm({ masterCode: "" });
    setSelectedUser(null);
    loadData();
  };

  const calculateTrialDaysLeft = () => {
    if (!subscription?.trial_end) return 0;
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading admin panel...</p>
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
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8 text-primary" />
                Administration
              </h1>
              <p className="text-muted-foreground">Manage users and subscription</p>
            </div>

            <Tabs defaultValue="users" className="w-full">
              <TabsList>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="qa-monitor">QA Monitor</TabsTrigger>
                <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>Manage user access to your organization</CardDescription>
                    </div>
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Invite User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite User</DialogTitle>
                          <DialogDescription>
                            Add a new team member to your organization
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite-email">Email</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              value={inviteForm.email}
                              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                              placeholder="user@company.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select
                              value={inviteForm.role}
                              onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                            >
                              <SelectTrigger id="invite-role">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="master_admin">Master Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="master-code">Master Code</Label>
                            <Input
                              id="master-code"
                              type="password"
                              value={inviteForm.masterCode}
                              onChange={(e) => setInviteForm({ ...inviteForm, masterCode: e.target.value })}
                              placeholder="Enter master code"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleInviteUser} disabled={!inviteForm.email || !inviteForm.masterCode}>
                            Send Invite
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-semibold">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{user.role.replace('_', ' ')}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user.id);
                                setRemoveDialogOpen(true);
                              }}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Subscription Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">Current Plan</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription?.status === 'trial' ? 'Free Trial' : subscription?.status}
                        </p>
                      </div>
                      <Badge variant={subscription?.status === 'trial' ? 'default' : 'outline'}>
                        {subscription?.status}
                      </Badge>
                    </div>

                    {subscription?.status === 'trial' && (
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-warning/10">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Trial Period
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {calculateTrialDaysLeft()} days remaining
                          </p>
                        </div>
                        <Button>Upgrade Plan</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6">
                {companyId && <OpsDashboardCard companyId={companyId} />}
                <div className="grid gap-6 md:grid-cols-2">
                  {companyId && <ComplianceStatusCard companyId={companyId} />}
                  {companyId && <AIInsightsCard companyId={companyId} />}
                </div>
                {companyId && <ForecastCard companyId={companyId} />}
                {companyId && <AlertsPanel companyId={companyId} />}
              </TabsContent>

              <TabsContent value="qa-monitor" className="space-y-4">
                {companyId && <QAMonitorCard companyId={companyId} />}
              </TabsContent>

              <TabsContent value="graph" className="space-y-4">
                <GraphManager />
              </TabsContent>
            </Tabs>

            {/* Remove User Dialog */}
            <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove User</DialogTitle>
                  <DialogDescription>
                    This action requires your Master Code for security
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="remove-master-code">Master Code</Label>
                    <Input
                      id="remove-master-code"
                      type="password"
                      value={removeForm.masterCode}
                      onChange={(e) => setRemoveForm({ masterCode: e.target.value })}
                      placeholder="Enter master code"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveUser}
                    disabled={!removeForm.masterCode}
                  >
                    Remove User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
