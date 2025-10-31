import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthGuard } from "./components/AuthGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import CompanyProfile from "./pages/CompanyProfile";
import Dashboard from "./pages/Dashboard";
import NIS2 from "./pages/NIS2";
import AIAct from "./pages/AIAct";
import Documents from "./pages/Documents";
import DocumentsNew from "./pages/DocumentsNew";
import Admin from "./pages/Admin";
import AuditLog from "./pages/AuditLog";
import NOC from "./pages/NOC";
import Controls from "./pages/Controls";
import Scope from "./pages/Scope";
import Evidence from "./pages/Evidence";
import Checks from "./pages/Checks";
import ChecksNewRule from "./pages/ChecksNewRule";
import ControlsMapping from "./pages/ControlsMapping";
import SettingsNotifications from "./pages/SettingsNotifications";
import RemediationEngine from "./pages/RemediationEngine";
import Integrations from "./pages/Integrations";
import Approvals from "./pages/Approvals";
import OpsDashboard from "./pages/OpsDashboard";
import HelpbotManager from "./pages/admin/HelpbotManager";
import TrainingCertificates from "./pages/admin/TrainingCertificates";
import AuditTasks from "./pages/audit/AuditTasks";
import NewAuditTask from "./pages/audit/NewAuditTask";
import AuditTaskDetail from "./pages/audit/AuditTaskDetail";
import DPIAList from "./pages/privacy/DPIAList";
import DPIADetail from "./pages/privacy/DPIADetail";
import Billing from "./pages/Billing";
import Demo from "./pages/Demo";
import RegisterAISystem from "./pages/ai/RegisterAISystem";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import { installDomGuards } from "./lib/dom-guards";
import { NorrlandGuide } from "./components/NorrlandGuide";
import { AppLayout } from "./components/AppLayout";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import TestRedirects from "./pages/admin/TestRedirects";
import TestI18n from "./pages/admin/TestI18n";
import RedirectTracer from "./testmode/RedirectTracer";
import NetProbe from "./testmode/NetProbe";

installDomGuards();

function GlobalNavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const { path, replace } = (e as CustomEvent).detail || {};
      if (typeof path === 'string') navigate(path, { replace: !!replace });
    };
    window.addEventListener('norrly:navigate', handler);
    return () => window.removeEventListener('norrly:navigate', handler);
  }, [navigate]);
  return null;
}

const App = () => (
  <TooltipProvider>
    <Toaster position="top-right" richColors closeButton expand duration={3500} />
    <NorrlandGuide />
    {import.meta.env.VITE_TEST_MODE === '1' && <RedirectTracer />}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GlobalNavigationBridge />
      <AuthProvider>
        <AuthGuard>
          <FeatureFlagProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/403" element={<Forbidden />} />
            
            {/* Protected routes with shared layout */}
            <Route element={<AppLayout />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/company-profile" element={
                <ErrorBoundary>
                  <CompanyProfile />
                </ErrorBoundary>
              } />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nis2" element={<NIS2 />} />
              <Route path="/ai-act" element={<AIAct />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/new" element={<DocumentsNew />} />
              <Route path="/controls" element={<Controls />} />
              <Route path="/scope" element={<Scope />} />
              <Route path="/evidence" element={<Evidence />} />
              <Route path="/checks" element={<Checks />} />
              <Route path="/checks/new" element={<ChecksNewRule />} />
              <Route path="/controls/mapping" element={<ControlsMapping />} />
              <Route path="/settings/notifications" element={<SettingsNotifications />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/audit" element={<AuditLog />} />
              <Route path="/admin/noc" element={<NOC />} />
              <Route path="/admin/remediation" element={<RemediationEngine />} />
              <Route path="/admin/integrations" element={<Integrations />} />
              <Route path="/admin/approvals" element={<Approvals />} />
              <Route path="/admin/ops" element={<OpsDashboard />} />
              <Route path="/admin/helpbot" element={<HelpbotManager />} />
              <Route path="/admin/training-certificates" element={<TrainingCertificates />} />
              {import.meta.env.VITE_TEST_MODE === '1' && (
                <>
                  <Route path="/admin/test-mode/redirects" element={<TestRedirects />} />
                  <Route path="/admin/test-mode/net" element={<NetProbe />} />
                  <Route path="/admin/test-mode/i18n" element={<TestI18n />} />
                </>
              )}
              <Route path="/audit" element={<AuditTasks />} />
              <Route path="/audit/new" element={<NewAuditTask />} />
              <Route path="/audit/:id" element={<AuditTaskDetail />} />
              <Route path="/privacy/dpia" element={<DPIAList />} />
              <Route path="/privacy/dpia/:id" element={<DPIADetail />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/ai-systems/register" element={<RegisterAISystem />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </FeatureFlagProvider>
        </AuthGuard>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
