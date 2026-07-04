import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import {
  Search, Activity, RefreshCw, Users, LogIn, LogOut, Upload,
  Trash2, Download, Eye, FileText, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, subDays } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawLog {
  id: string;
  user_id: string;
  activity_type: string;
  details: Record<string, any> | null;
  user_agent: string | null;
  created_at: string;
}

interface RawSession {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  is_active: boolean;
  duration_seconds: number | null;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string;
}

const LABELS: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  upload_pdf: "Uploaded PDF",
  delete_pdf: "Deleted PDF",
  download_pdf: "Downloaded PDF",
  view_pdf: "Viewed PDF",
  contribute_upload: "Contributed Material",
  upload_approved: "Upload Approved",
  upload_rejected: "Upload Rejected",
  login_failed: "Failed Login Attempt",
};

function label(type: string): string {
  return LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionIcon(type: string) {
  const cls = "w-4 h-4";
  if (type === "login") return <LogIn className={cls} />;
  if (type === "logout") return <LogOut className={cls} />;
  if (type.startsWith("upload") || type === "contribute_upload") return <Upload className={cls} />;
  if (type.includes("delete")) return <Trash2 className={cls} />;
  if (type === "download_pdf") return <Download className={cls} />;
  if (type.includes("view")) return <Eye className={cls} />;
  return <FileText className={cls} />;
}

function displayName(p: ProfileLite | undefined, userId: string): string {
  if (!p) return userId.slice(0, 8);
  if (p.full_name && p.full_name.trim()) return p.full_name;
  return p.email.split("@")[0];
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminActivity() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const [logs, setLogs] = useState<RawLog[]>([]);
  const [sessions, setSessions] = useState<RawSession[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchData = useCallback(async () => {
    try {
      const since = subDays(new Date(), 30).toISOString();

      const [{ data: rawLogs, error: logsErr }, { data: rawSessions, error: sessErr }] = await Promise.all([
        supabase
          .from("user_activity_logs")
          .select("id, user_id, activity_type, details, user_agent, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("user_sessions")
          .select("id, user_id, login_at, logout_at, is_active, duration_seconds")
          .gte("login_at", since)
          .order("login_at", { ascending: false })
          .limit(1000),
      ]);

      if (logsErr) throw logsErr;
      if (sessErr) throw sessErr;

      const uids = new Set<string>();
      (rawLogs || []).forEach((r) => uids.add(r.user_id));
      (rawSessions || []).forEach((r) => uids.add(r.user_id));

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...uids]);

      setProfiles(new Map((profileRows || []).map((p) => [p.id, p])));
      setLogs(rawLogs || []);
      setSessions(rawSessions || []);
    } catch (err: any) {
      console.error("Failed to load activity:", err);
      toast.error("Couldn't load activity data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ─── Derived stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const dayAgo = subDays(now, 1);
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    const activeInWindow = (start: Date) => {
      const ids = new Set<string>();
      logs.forEach((l) => new Date(l.created_at) >= start && ids.add(l.user_id));
      sessions.forEach((s) => new Date(s.login_at) >= start && ids.add(s.user_id));
      return ids.size;
    };

    return {
      dau: activeInWindow(dayAgo),
      wau: activeInWindow(weekAgo),
      mau: activeInWindow(monthAgo),
    };
  }, [logs, sessions]);

  const topUsers = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => counts.set(l.user_id, (counts.get(l.user_id) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count, profile: profiles.get(userId) }));
  }, [logs, profiles]);

  // ─── Search drill-down ──────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    if (search.trim().length < 2) return null;
    const q = search.trim().toLowerCase();

    const matchingIds = new Set(
      [...profiles.values()]
        .filter((p) => (p.full_name || "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
        .map((p) => p.id)
    );

    if (matchingIds.size === 0) return { userLogs: [], userSessions: [] };

    return {
      userLogs: logs.filter((l) => matchingIds.has(l.user_id)).slice(0, 100),
      userSessions: sessions.filter((s) => matchingIds.has(s.user_id)).slice(0, 50),
    };
  }, [search, profiles, logs, sessions]);

  if (adminLoading || loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Activity"
        subtitle="Usage signal at a glance, plus per-user drill-down"
        showBack
        backTo="/admin"
        icon={<Activity className="h-5 w-5 text-primary" />}
      />

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Active today</p>
            <p className="text-2xl font-bold">{stats.dau}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Active (7 days)</p>
            <p className="text-2xl font-bold">{stats.wau}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Active (30 days)</p>
            <p className="text-2xl font-bold">{stats.mau}</p>
          </Card>
        </div>

        {/* Top active users */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Most active (last 30 days)</h3>
          </div>
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {topUsers.map(({ userId, count, profile }) => {
                const name = displayName(profile, userId);
                return (
                  <div key={userId} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {profile?.email && <p className="text-xs text-muted-foreground truncate">{profile.email}</p>}
                      </div>
                    </div>
                    <Badge variant="secondary">{count} events</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Search drill-down */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Look up a user's raw activity</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          {!searchResults && (
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters of a name or email to pull that user's session and event history.
            </p>
          )}

          {searchResults && searchResults.userLogs.length === 0 && searchResults.userSessions.length === 0 && (
            <EmptyState
              icon={<Activity className="h-10 w-10 text-muted-foreground" />}
              title="No matching user or no activity found"
            />
          )}

          {searchResults && (searchResults.userLogs.length > 0 || searchResults.userSessions.length > 0) && (
            <div className="space-y-4">
              {searchResults.userSessions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sessions</p>
                  <div className="space-y-1.5">
                    {searchResults.userSessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <span>{format(new Date(s.login_at), "MMM d, yyyy · h:mm a")}</span>
                        <span className="text-muted-foreground">
                          {s.is_active ? "Active now" : s.duration_seconds ? `${Math.round(s.duration_seconds / 60)} min` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.userLogs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Events</p>
                  <div className="space-y-1.5">
                    {searchResults.userLogs.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{actionIcon(l.activity_type)}</span>
                        <span className="flex-1">{label(l.activity_type)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
