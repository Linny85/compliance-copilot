import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { I18nProvider } from "./contexts/I18nContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import CompanyProfile from "./pages/CompanyProfile";
import Dashboard from "./pages/Dashboard";
import NIS2 from "./pages/NIS2";
import AIAct from "./pages/AIAct";
import Documents from "./pages/Documents";
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
import NotFound from "./pages/NotFound";
import { installDomGuards } from "./lib/dom-guards";

installDomGuards();

const App = () => (
  <I18nProvider>
        <TooltipProvider>
          <Toaster position="top-right" richColors closeButton expand duration={3500} />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthGuard>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthGuard>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
);

export default App;
