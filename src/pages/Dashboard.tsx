import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NextStepsCard } from "@/components/dashboard/NextStepsCard";
import { TrialCard } from "@/components/dashboard/TrialCard";
import { OrganizationCard } from "@/components/dashboard/OrganizationCard";
import { TrainingCertificatesCard } from "@/components/training/TrainingCertificatesCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface CompanyData {
  name: string;
  country: string;
  sector: string;
}

interface SubscriptionData {
  status: string;
  trial_end: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, ready } = useTranslation(['common', 'dashboard']);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: "",
    country: "",
    sector: "",
  });
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    status: "trial",
    trial_end: null,
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      // Get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        navigate("/onboarding");
        return;
      }

      // Load company data
      const { data: company } = await supabase
        .from("Unternehmen")
        .select("name, country, sector")
        .eq("id", profile.company_id)
        .single();

      if (company) {
        setCompanyData({
          name: company.name || "",
          country: company.country || "",
          sector: company.sector || "other",
        });
      }

      // Load subscription data
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, trial_end")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (subscription) {
        setSubscriptionData({
          status: subscription.status || "trial",
          trial_end: subscription.trial_end,
        });
      }

      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [navigate]);

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{ready ? t('common.loading') : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-[100dvh] w-full bg-background">
        <AppSidebar />
        <main className="flex-1 min-h-0 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Header with Language Switcher */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('dashboard.welcome')}
                </h1>
                <p className="text-muted-foreground">
                  {companyData.name}
                </p>
              </div>
              <LanguageSwitcher />
            </div>

            {/* Main Cards Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                <NextStepsCard />
                <TrialCard 
                  trialEnd={subscriptionData.trial_end}
                  subscriptionStatus={subscriptionData.status}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <OrganizationCard
                  companyName={companyData.name}
                  country={companyData.country}
                  sector={companyData.sector}
                />
                {userId && <TrainingCertificatesCard userId={userId} />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
