import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import Incidents from "./pages/Incidents";
import IncidentNew from "./pages/IncidentNew";
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
import OrganizationView from "./pages/OrganizationView";
import { installDomGuards } from "./lib/dom-guards";
import { NorrlandGuide } from "./components/NorrlandGuide";
import { AppLayout } from "./components/AppLayout";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import RequireAdmin from "./components/auth/RequireAdmin";
import TestRedirects from "./pages/admin/TestRedirects";
import TestI18n from "./pages/admin/TestI18n";
import TestI18nPatches from "./pages/admin/TestI18nPatches";
import TestPhase3 from "./pages/admin/TestPhase3";
import TestPhase4 from "./pages/admin/TestPhase4";
import RedirectTracer from "./testmode/RedirectTracer";
import NetProbe from "./testmode/NetProbe";
import DebugHealth from "./debug/DebugHealth";
import DebugThrow from "./pages/DebugThrow";

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
              <Route path="/organization" element={<OrganizationView />} />
              <Route path="/company-profile" element={
                <ErrorBoundary>
                  <CompanyProfile />
                </ErrorBoundary>
              } />
              <Route path="/dashboard" element={
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              } />
              <Route path="/nis2" element={
                <ErrorBoundary>
                  <NIS2 />
                </ErrorBoundary>
              } />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/incidents/new" element={<IncidentNew />} />
              <Route path="/incident/new" element={<Navigate to="/incidents/new" replace />} />
              <Route path="/ai-act" element={
                <ErrorBoundary>
                  <AIAct />
                </ErrorBoundary>
              } />
              <Route path="/documents" element={
                <ErrorBoundary>
                  <Documents />
                </ErrorBoundary>
              } />
              <Route path="/documents/new" element={<DocumentsNew />} />
              <Route path="/controls" element={
                <ErrorBoundary>
                  <Controls />
                </ErrorBoundary>
              } />
              <Route path="/scope" element={<Scope />} />
              <Route path="/evidence" element={<Evidence />} />
              <Route path="/checks" element={
                <ErrorBoundary>
                  <Checks />
                </ErrorBoundary>
              } />
              <Route path="/checks/new" element={<ChecksNewRule />} />
              <Route path="/pruefungen" element={<Navigate to="/checks" replace />} />
              <Route path="/controls/mapping" element={<ControlsMapping />} />
              <Route path="/settings/notifications" element={<SettingsNotifications />} />
              <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
              <Route path="/admin/audit" element={<RequireAdmin><AuditLog /></RequireAdmin>} />
              <Route path="/admin/noc" element={<RequireAdmin><NOC /></RequireAdmin>} />
              <Route path="/admin/remediation" element={<RequireAdmin><RemediationEngine /></RequireAdmin>} />
              <Route path="/admin/integrations" element={<RequireAdmin><Integrations /></RequireAdmin>} />
              <Route path="/admin/approvals" element={<RequireAdmin><Approvals /></RequireAdmin>} />
              <Route path="/admin/ops" element={<RequireAdmin><OpsDashboard /></RequireAdmin>} />
              <Route path="/admin/helpbot" element={<RequireAdmin><HelpbotManager /></RequireAdmin>} />
              <Route path="/admin/training-certificates" element={<RequireAdmin><TrainingCertificates /></RequireAdmin>} />
              {import.meta.env.VITE_TEST_MODE === '1' && (
                <>
                  <Route path="/admin/test-mode/redirects" element={<RequireAdmin><TestRedirects /></RequireAdmin>} />
                  <Route path="/admin/test-mode/net" element={<RequireAdmin><NetProbe /></RequireAdmin>} />
                  <Route path="/admin/test-mode/i18n" element={<RequireAdmin><TestI18n /></RequireAdmin>} />
                  <Route path="/admin/test-mode/i18n/patches" element={<RequireAdmin><TestI18nPatches /></RequireAdmin>} />
                  <Route path="/admin/test-mode/phase3" element={<RequireAdmin><TestPhase3 /></RequireAdmin>} />
                  <Route path="/admin/test-mode/phase4" element={<RequireAdmin><TestPhase4 /></RequireAdmin>} />
                </>
              )}
              {import.meta.env.DEV && (
                <>
                  <Route path="/debug/health" element={<DebugHealth />} />
                  <Route path="/debug/throw" element={
                    <ErrorBoundary>
                      <DebugThrow />
                    </ErrorBoundary>
                  } />
                </>
              )}
              <Route path="/audit" element={<AuditTasks />} />
              <Route path="/audit/new" element={<NewAuditTask />} />
              <Route path="/audit/:id" element={<AuditTaskDetail />} />
              <Route path="/audits" element={<Navigate to="/audit" replace />} />
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
