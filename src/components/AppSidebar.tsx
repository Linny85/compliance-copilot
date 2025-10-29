import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldAlert,
  Brain,
  Wrench,
  FileCheck,
  PlayCircle,
  FileText,
  BarChart3,
  Building2,
  Plug,
  Settings,
  HelpCircle,
  LogOut,
  Database,
  Award,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useFeatures } from "@/contexts/FeatureFlagContext";
import { isDemo } from "@/config/appMode";

export function AppSidebar() {
  const navigate = useNavigate();
  const { t, ready, lng } = useI18n();
  const isAdmin = useIsAdmin();
  const { hasFeature } = useFeatures();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t.nav.logout);
    navigate("/auth");
  };

  // Don't render until i18n is ready
  if (!ready) return null;

  // Main Navigation Items - recreate when language changes
  const mainNavItems = [
    { title: t.nav.dashboard, url: "/dashboard", icon: LayoutDashboard },
    { title: t.nav.risks, url: "/nis2", icon: ShieldAlert },
    { title: t.nav.ai, url: "/ai-act", icon: Brain },
    { title: t.nav.controls, url: "/controls", icon: Wrench },
    { title: t.nav.evidence, url: "/evidence", icon: FileCheck, feature: "evidence" },
    { title: t.nav.checks, url: "/checks", icon: PlayCircle, feature: "checks" },
    { title: "Audit Tasks", url: "/audit", icon: ClipboardCheck },
    // Dokumente nur in Trial/Prod
    ...(!isDemo() ? [{ title: t.nav.docs, url: "/documents", icon: FileText }] : []),
    { title: t.nav.certificates, url: "/admin/training-certificates", icon: Award, adminOnly: true, feature: "trainingCertificates" },
    { title: t.nav.reports, url: "/admin/ops", icon: BarChart3, adminOnly: true, feature: "reports" },
  ].filter(item => !item.feature || hasFeature(item.feature as any));

  // System Items - recreate when language changes
  const systemNavItems = [
    { title: t.nav.organization, url: "/company-profile", icon: Building2 },
    { title: t.nav.integrations, url: "/admin/integrations", icon: Plug, adminOnly: true, feature: "integrations" },
    { title: t.nav.helpbot_manager, url: "/admin/helpbot", icon: Database, adminOnly: true },
    ...(isAdmin ? [{ title: t.nav.admin, url: "/admin", icon: Settings }] : []),
  ].filter(item => !item.feature || hasFeature(item.feature as any));

  return (
    <Sidebar className="w-full h-full" collapsible="none">
      {/* Logo Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg">
          N
        </div>
        <span className="font-semibold text-sidebar-foreground">NIS2 AI Guard</span>
      </div>
      
      

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
                    <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : ""
                        }
                       >
                         <item.icon className="h-4 w-4" />
                         <span>{item.title}</span>
                       </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                     >
                       <item.icon className="h-4 w-4" />
                       <span>{item.title}</span>
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Help Button (opens guide drawer) */}
               <SidebarMenuItem>
                 <SidebarMenuButton onClick={() => {}}>
                   <HelpCircle className="h-4 w-4" />
                   <span>{t.nav.help}</span>
                 </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
               <SidebarMenuItem>
                 <SidebarMenuButton onClick={handleLogout}>
                   <LogOut className="h-4 w-4" />
                   <span>{t.nav.logout}</span>
                 </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
