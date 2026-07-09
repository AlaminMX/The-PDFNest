import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoadingState } from "@/components/LoadingState";
import {
  ArrowLeft, LayoutDashboard, Building2, UserCog, Megaphone, Activity,
  ShoppingBag, Inbox, FileText, LogOut, Moon, Tag,
} from "lucide-react";
import { toast } from "sonner";

const items = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Faculties", path: "/admin/faculties", icon: Building2 },
  { label: "Departments", path: "/admin/departments", icon: Building2 },
  { label: "Categories", path: "/admin/categories", icon: Tag },
  { label: "Reps", path: "/admin/reps", icon: UserCog },
  { label: "Banners", path: "/admin/banners", icon: Megaphone },
  { label: "Activity", path: "/admin/activity", icon: Activity },
  { label: "Final Year Projects", path: "/admin/projects", icon: ShoppingBag },
  { label: "Pending Uploads", path: "/admin/uploads", icon: Inbox },
  { label: "Past Questions", path: "/admin/past-questions", icon: FileText },
];

function RamadanRow() {
  const { settings, updateSetting } = useAppSettings();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
        <Label className="text-xs truncate">Ramadan</Label>
      </div>
      <Switch
        checked={settings.ramadan_theme_enabled}
        disabled={busy}
        onCheckedChange={async (v) => {
          setBusy(true);
          const ok = await updateSetting("ramadan_theme_enabled", v ? "true" : "false");
          toast[ok ? "success" : "error"](ok ? (v ? "Ramadan theme on" : "Ramadan theme off") : "Failed");
          setBusy(false);
        }}
      />
    </div>
  );
}

function AdminSidebar({ pendingUploadsCount }: { pendingUploadsCount: number }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img
            src="/pdfnest-logo.png"
            alt="PDFNest"
            className="h-8 w-8 rounded-lg object-contain shrink-0"
          />
          <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            Admin Console
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.path} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.path === "/admin/uploads" && pendingUploadsCount > 0 && (
                          <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 group-data-[collapsible=icon]:hidden">
                            {pendingUploadsCount > 99 ? "99+" : pendingUploadsCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1 group-data-[collapsible=icon]:hidden">
        <RamadanRow />
        <ThemeToggle />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-9 text-xs"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to App
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-9 text-xs text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AdminShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Skip admin auth guard (dashboard runs its own). */
  skipGuard?: boolean;
}

export function AdminShell({ title, subtitle, icon, actions, children, skipGuard }: AdminShellProps) {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (skipGuard) return;
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate, skipGuard]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { count } = await supabase
        .from("community_uploads")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count || 0);
    };
    load();
    const channel = supabase
      .channel("admin_shell_pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_uploads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  if (!skipGuard && (adminLoading || !isAdmin)) {
    return <LoadingState message="Verifying access..." />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar pendingUploadsCount={pendingCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 px-3 md:px-6 py-3">
              <SidebarTrigger />
              {icon && <div className="shrink-0 hidden sm:block">{icon}</div>}
              <div className="min-w-0 flex-1">
                <h1 className="text-base md:text-xl font-bold truncate leading-tight">{title}</h1>
                {subtitle && (
                  <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2 shrink-0">{actions}</div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
