import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Clock, RefreshCw, Shield, AlertTriangle, Monitor, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface Session {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  is_active: boolean;
  duration_seconds: number | null;
  user_agent: string | null;
  user_name?: string;
  user_email?: string;
}

interface FailedLogin {
  id: string;
  user_id: string;
  created_at: string;
  details: Record<string, any> | null;
  user_agent: string | null;
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  return "Desktop";
}

function browserLabel(ua: string | null): string {
  if (!ua) return "";
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/edg/i.test(ua)) return "Edge";
  return "Browser";
}

function duration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function AdminSessionLogs() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"sessions" | "security">("sessions");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [sessRes, failRes, profilesRes] = await Promise.all([
        supabase
          .from("user_sessions")
          .select("id, user_id, login_at, logout_at, is_active, duration_seconds, user_agent")
          .order("login_at", { ascending: false })
          .limit(200),
        supabase
          .from("user_activity_logs")
          .select("id, user_id, created_at, details, user_agent")
          .eq("activity_type", "login_failed")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      const pmap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      setSessions((sessRes.data || []).map((s: any) => ({
        ...s,
        user_name:  pmap.get(s.user_id)?.full_name ?? undefined,
        user_email: pmap.get(s.user_id)?.email      ?? undefined,
      })));

      setFailedLogins((failRes.data || []).map((f: any) => ({
        id: f.id,
        user_id: f.user_id,
        created_at: f.created_at,
        details: f.details ?? {},
        user_agent: f.user_agent,
      })));
    } catch (err) {
      toast.error("Failed to load session data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Refreshed");
  };

  const stats = useMemo(() => ({
    active:  sessions.filter(s => s.is_active).length,
    today:   sessions.filter(s => new Date(s.login_at).toDateString() === new Date().toDateString()).length,
    failed:  failedLogins.length,
  }), [sessions, failedLogins]);

  if (adminLoading || loading) return <LoadingState message="Loading session data…" />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader
        title="Sessions & Security"
        subtitle="Sign-in history and failed login attempts"
        showBack
        backTo="/admin"
        icon={<Shield className="h-5 w-5 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Active now</p>
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sessions today</p>
            <p className="text-2xl font-bold">{stats.today}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Failed logins</p>
            <p className={`text-2xl font-bold ${stats.failed > 0 ? "text-amber-500" : ""}`}>{stats.failed}</p>
          </Card>
        </div>

        {/* Tabs + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {([
              { key: "sessions",  label: "Sessions",       icon: Clock },
              { key: "security",  label: "Failed Logins",  icon: AlertTriangle },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.key === "security" && stats.failed > 0 && (
                  <span className="ml-1 min-w-4 h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] px-1">
                    {stats.failed}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Sessions tab */}
        {tab === "sessions" && (
          <Card className="overflow-hidden divide-y divide-border/20">
            {sessions.length === 0 ? (
              <EmptyState icon={<Clock className="h-8 w-8 text-muted-foreground" />} title="No sessions found" description="Sign-in activity will appear here." />
            ) : (
              sessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.is_active ? "bg-green-500/10 text-green-600" : "bg-muted/50 text-muted-foreground"}`}>
                    {s.is_active ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-medium text-sm">
                        {s.user_name || s.user_email?.split("@")[0] || "Unknown user"}
                      </span>
                      {s.is_active && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 text-green-600 bg-green-500/10 border-green-500/20">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/70 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span title={format(new Date(s.login_at), "PPpp")}>
                        Signed in {formatDistanceToNow(new Date(s.login_at), { addSuffix: true })}
                      </span>
                      {s.duration_seconds != null && (
                        <span>Duration: {duration(s.duration_seconds)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {deviceLabel(s.user_agent)} · {browserLabel(s.user_agent)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <Card className="overflow-hidden divide-y divide-border/20">
            {failedLogins.length === 0 ? (
              <EmptyState icon={<Shield className="h-8 w-8 text-muted-foreground" />} title="No failed logins" description="Failed sign-in attempts will appear here." />
            ) : (
              failedLogins.map(f => (
                <div key={f.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Failed sign-in attempt
                      {f.details?.identifier ? ` for ${f.details.identifier}` : ""}
                    </p>
                    <div className="text-xs text-muted-foreground/70 flex flex-wrap gap-x-3 mt-0.5">
                      <span title={format(new Date(f.created_at), "PPpp")}>
                        {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                      </span>
                      <span>{deviceLabel(f.user_agent)} · {browserLabel(f.user_agent)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
