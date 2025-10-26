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
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { t, ready } = useI18n();
  const isAdmin = useIsAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t('logout', { ns: 'nav' }));
    navigate("/auth");
  };

  const isCollapsed = state === "collapsed";

  // Don't render until i18n is ready
  if (!ready) return null;

  // Main Navigation Items
  const mainNavItems = [
    { title: t('dashboard', { ns: 'nav' }), url: "/dashboard", icon: LayoutDashboard },
    { title: t('risks', { ns: 'nav' }), url: "/nis2", icon: ShieldAlert },
    { title: t('ai', { ns: 'nav' }), url: "/ai-act", icon: Brain },
    { title: t('controls', { ns: 'nav' }), url: "/controls", icon: Wrench },
    { title: t('evidence', { ns: 'nav' }), url: "/evidence", icon: FileCheck },
    { title: t('checks', { ns: 'nav' }), url: "/checks", icon: PlayCircle },
    { title: t('docs', { ns: 'nav' }), url: "/documents", icon: FileText },
    { title: t('certificates', { ns: 'nav' }), url: "/admin/training-certificates", icon: Award, adminOnly: true },
    { title: t('reports', { ns: 'nav' }), url: "/admin/ops", icon: BarChart3, adminOnly: true },
  ];

  // System Items
  const systemNavItems = [
    { title: t('organization', { ns: 'nav' }), url: "/company-profile", icon: Building2 },
    { title: t('integrations', { ns: 'nav' }), url: "/admin/integrations", icon: Plug, adminOnly: true },
    { title: t('helpbot_manager', { ns: 'nav' }), url: "/admin/helpbot", icon: Database, adminOnly: true },
    ...(isAdmin ? [{ title: t('admin', { ns: 'nav' }), url: "/admin", icon: Settings }] : []),
  ];

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      {/* Logo Header */}
      {!isCollapsed && (
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg">
            N
          </div>
          <span className="font-semibold text-sidebar-foreground">NIS2 AI Guard</span>
        </div>
      )}
      
      

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
                        {!isCollapsed && <span>{item.title}</span>}
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
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Help Button (opens guide drawer) */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => {}}>
                  <HelpCircle className="h-4 w-4" />
                  {!isCollapsed && <span>{t('help', { ns: 'nav' })}</span>}
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
                  {!isCollapsed && <span>{t('logout', { ns: 'nav' })}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
