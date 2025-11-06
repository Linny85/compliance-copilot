import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldAlert,
  Brain,
  Wrench,
  FileCheck,
  BadgeCheck,
  FileText,
  BarChart3,
  Building2,
  Plug,
  Settings,
  HelpCircle,
  LogOut,
  Database,
  Award,
  ClipboardList,
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
import { useFeatures } from "@/contexts/FeatureFlagContext";
import { isDemo } from "@/config/appMode";

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { t, ready, lng } = useI18n();
  const isAdmin = useIsAdmin();
  const { hasFeature } = useFeatures();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t.nav.logout);
    navigate("/auth");
  };

  const isCollapsed = state === "collapsed";

  // Don't render until i18n is ready
  if (!ready) return null;

  // Main Navigation Items - key-based for reliable i18n
  type NavItem = { key: string; to: string; icon: any; feature?: string; adminOnly?: boolean; label: string };
  
  // Stable, deterministic nav computation
  const mainNavItems = React.useMemo<NavItem[]>(() => {
    const baseItems: Omit<NavItem, 'label'>[] = [
      { key: 'dashboard', to: "/dashboard", icon: LayoutDashboard },
      { key: 'risks', to: "/nis2", icon: ShieldAlert },
      { key: 'ai', to: "/ai-act", icon: Brain },
      { key: 'controls', to: "/controls", icon: Wrench },
      { key: 'evidence', to: "/evidence", icon: FileCheck, feature: "evidence" },
      { key: 'checks', to: "/checks", icon: BadgeCheck, feature: "checks" },
      { key: 'audits', to: "/audit", icon: ClipboardList },
      ...(!isDemo() ? [{ key: 'docs', to: "/documents", icon: FileText }] : []),
      { key: 'certificates', to: "/admin/training-certificates", icon: Award, adminOnly: true, feature: "trainingCertificates" },
      { key: 'reports', to: "/admin/ops", icon: BarChart3, adminOnly: true, feature: "reports" },
    ];

    return baseItems
      .filter(item => !item.feature || hasFeature(item.feature as any))
      .map(item => ({ ...item, label: t.nav[item.key] || item.key }));
  }, [hasFeature, t.nav, ready]);

  const systemNavItems = React.useMemo<NavItem[]>(() => {
    const baseItems: Omit<NavItem, 'label'>[] = [
      { key: 'organization', to: "/organization", icon: Building2 },
      { key: 'integrations', to: "/admin/integrations", icon: Plug, adminOnly: true, feature: "integrations" },
      { key: 'helpbot_manager', to: "/admin/helpbot", icon: Database, adminOnly: true },
      // Admin item - only when isAdmin is explicitly true (not null/loading)
      ...(isAdmin === true ? [{ key: 'admin', to: "/admin", icon: Settings }] : []),
    ];

    return baseItems
      .filter(item => !item.feature || hasFeature(item.feature as any))
      .map(item => ({ ...item, label: t.nav[item.key] || item.key }));
  }, [isAdmin, hasFeature, t.nav, ready]);

  // Disambiguation helper - stable per render
  const getDisambiguatedLabel = React.useCallback((items: NavItem[]) => {
    const seen = new Map<string, number>();
    return items.map(item => {
      const text = item.label;
      const count = (seen.get(text) ?? 0) + 1;
      seen.set(text, count);
      
      if (count === 1) return { ...item, displayLabel: text };
      
      // Second instance - make distinguishable
      if (item.key === 'checks') return { ...item, displayLabel: `${text} · Auto` };
      if (item.key === 'audits') return { ...item, displayLabel: `${text} · Manuell` };
      return { ...item, displayLabel: `${text} · ${item.key}` };
    });
  }, []);

  const mainNavWithLabels = React.useMemo(() => getDisambiguatedLabel(mainNavItems), [mainNavItems, getDisambiguatedLabel]);
  const systemNavWithLabels = React.useMemo(() => getDisambiguatedLabel(systemNavItems), [systemNavItems, getDisambiguatedLabel]);

  // Debug logging in useEffect, not during render
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const allItems = [...mainNavWithLabels, ...systemNavWithLabels];
      console.group('[AppSidebar] Navigation Table');
      console.table(allItems.map(i => ({
        key: i.key,
        route: i.to,
        label: i.label,
        displayLabel: i.displayLabel,
        adminOnly: i.adminOnly || false,
        isAdmin: isAdmin ?? 'loading'
      })));
      console.groupEnd();
    }
  }, [mainNavWithLabels, systemNavWithLabels, isAdmin]);

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
              {mainNavWithLabels
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
                    <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : ""
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.displayLabel}</span>}
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
              {systemNavWithLabels
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.displayLabel}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Help Button (opens guide drawer) */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => {}}>
                  <HelpCircle className="h-4 w-4" />
                  {!isCollapsed && <span>{t.nav.help}</span>}
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
                  {!isCollapsed && <span>{t.nav.logout}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
