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
  const { t, ready } = useI18n();
  const isAdmin = useIsAdmin();
  const { hasFeature } = useFeatures();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t.nav.logout);
    navigate("/auth");
  };

  const isCollapsed = state === "collapsed";

  // Base navigation items - no conditions, pure data
  type NavItem = { 
    key: string; 
    to: string; 
    icon: any; 
    feature?: string; 
    adminOnly?: boolean;
  };
  
  const baseMainItems = React.useMemo<NavItem[]>(() => [
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
  ], []);

  const baseSystemItems = React.useMemo<NavItem[]>(() => [
    { key: 'organization', to: "/organization", icon: Building2 },
    { key: 'integrations', to: "/admin/integrations", icon: Plug, adminOnly: true, feature: "integrations" },
    { key: 'helpbot_manager', to: "/admin/helpbot", icon: Database, adminOnly: true },
  ], []);

  // Deterministic derivation: filter by features, add admin conditionally, dedupe, sort
  const derivedMainItems = React.useMemo(() => {
    return baseMainItems
      .filter(item => !item.feature || hasFeature(item.feature as any))
      .filter(item => !item.adminOnly || isAdmin === true);
  }, [baseMainItems, hasFeature, isAdmin]);

  const derivedSystemItems = React.useMemo(() => {
    const items = baseSystemItems
      .filter(item => !item.feature || hasFeature(item.feature as any))
      .filter(item => !item.adminOnly || isAdmin === true);
    
    // Add admin item only when explicitly admin
    const allowAdmin = isAdmin === true;
    if (allowAdmin) {
      items.push({ key: 'admin', to: "/admin", icon: Settings });
    }
    
    return items;
  }, [baseSystemItems, hasFeature, isAdmin]);

  // Materialize labels in stable memo
  type NavItemWithLabel = NavItem & { displayLabel: string };
  
  const mainNavWithLabels = React.useMemo<NavItemWithLabel[]>(() => {
    return derivedMainItems.map(item => ({
      ...item,
      displayLabel: ready ? (t.nav[item.key] || item.key) : item.key
    }));
  }, [derivedMainItems, t.nav, ready]);

  const systemNavWithLabels = React.useMemo<NavItemWithLabel[]>(() => {
    const items = derivedSystemItems.map(item => ({
      ...item,
      displayLabel: ready ? (t.nav[item.key] || item.key) : item.key
    }));
    
    // Disambiguation for duplicate labels
    const seen = new Map<string, number>();
    return items.map(item => {
      const count = (seen.get(item.displayLabel) ?? 0) + 1;
      seen.set(item.displayLabel, count);
      
      if (count === 1) return item;
      
      // Make distinguishable
      if (item.key === 'checks') return { ...item, displayLabel: `${item.displayLabel} · Auto` };
      if (item.key === 'audits') return { ...item, displayLabel: `${item.displayLabel} · Manuell` };
      return { ...item, displayLabel: `${item.displayLabel} · ${item.key}` };
    });
  }, [derivedSystemItems, t.nav, ready]);

  // Debug logging ONLY in useEffect
  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    const allItems = [...mainNavWithLabels, ...systemNavWithLabels];
    console.group('[AppSidebar] Navigation Table');
    console.table(allItems.map(i => ({
      key: i.key,
      route: i.to,
      displayLabel: i.displayLabel,
      adminOnly: i.adminOnly || false,
      isAdmin: isAdmin ?? 'loading'
    })));
    console.groupEnd();
  }, [mainNavWithLabels, systemNavWithLabels, isAdmin]);

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon" data-testid="app-sidebar" role="navigation" aria-label="Primary">
      {/* Logo Header */}
      {!isCollapsed && (
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg">
            N
          </div>
          <span className="font-semibold text-sidebar-foreground">Compliance Copilot</span>
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
                    <SidebarMenuItem key={item.to} data-testid={`nav-item-${item.key}`}>
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
                <SidebarMenuItem key={item.to} data-testid={`nav-item-${item.key}`}>
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
              <SidebarMenuItem data-testid="nav-item-help">
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
