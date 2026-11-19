import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AdminShell } from "@/components/AdminShell";
import { LoadingState } from "@/components/LoadingState";
import { useQuery } from "@tanstack/react-query";
import { Search, Activity, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { subDays } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawLog {
  id: string;
  user_id: string;
  created_at: string;
}

interface RawSession {
  id: string;
  user_id: string;
  login_at: string;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

function displayName(p: ProfileLite | undefined, userId: string): string {
  if (!p) return userId.slice(0, 8);
  if (p.full_name && p.full_name.trim()) return p.full_name;
  return p.email?.split("@")[0] || "Unnamed account";
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
  const [overviewError, setOverviewError] = useState(false);
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
      setOverviewError(false);
      const since = subDays(new Date(), 30).toISOString();

      const [{ data: rawLogs, error: logsErr }, { data: rawSessions, error: sessErr }] = await Promise.all([
        supabase
          .from("user_activity_logs")
          .select("id, user_id, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("user_sessions")
          .select("id, user_id, login_at")
          .gte("login_at", since)
          .order("login_at", { ascending: false })
          .limit(1000),
      ]);

      if (logsErr) throw logsErr;
      if (sessErr) throw sessErr;

      const counts = new Map<string, number>();
      for (const log of rawLogs ?? []) counts.set(log.user_id, (counts.get(log.user_id) ?? 0) + 1);
      const topIds = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!).slice(0, 5);
      if (topIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", topIds);
        if (profilesError) throw profilesError;
        setProfiles(new Map(profileRows.map((profile) => [profile.id, profile])));
      } else {
        setProfiles(new Map());
      }
      setLogs(rawLogs || []);
      setSessions(rawSessions || []);
    } catch (err: any) {
      console.error("Failed to load activity:", err);
      setOverviewError(true);
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

  const term = search.trim().slice(0, 100);
  const studentSearch = useQuery({
    queryKey: ["admin-activity-profile-search", term],
    enabled: isAdmin && term.length >= 2,
    queryFn: async ({ signal }) => {
      const pattern = '%' + term.replace(/[\\%_]/g, (character) => '\\' + character) + '%';
      const results = await Promise.all(
        (["full_name", "email", "nickname"] as const).map((field) =>
          supabase.from("profiles")
            .select("id, full_name, nickname, email, is_student")
            .ilike(field, pattern)
            .order("full_name")
            .limit(12)
            .abortSignal(signal),
        ),
      );
      const matches = new Map<string, ProfileLite & { nickname: string | null; is_student: boolean | null }>();
      for (const result of results) {
        if (result.error) throw result.error;
        for (const profile of result.data) matches.set(profile.id, profile);
      }
      return [...matches.values()];
    },
  });

  if (adminLoading || !isAdmin) {
    return <LoadingState />;
  }

  return (
    <AdminShell
      title="Activity"
      subtitle="Find a student and review their library activity"
      icon={<Activity className="h-5 w-5 text-primary" />}
    >
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Find a student</h3>
          </div>
          <Input
            aria-label="Search accounts by name, nickname, or email"
            placeholder="Search by name, nickname, or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {term.length >= 2 && (
            <div className="mt-3 space-y-1">
              {studentSearch.isPending && <p role="status" className="text-sm text-muted-foreground">Searching…</p>}
              {studentSearch.isError && (
                <Button size="sm" variant="outline" onClick={() => void studentSearch.refetch()}>Search failed. Retry</Button>
              )}
              {studentSearch.data?.length === 0 && <p className="text-sm text-muted-foreground">No matching accounts.</p>}
              {studentSearch.data?.map((profile) => (
                <div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{profile.nickname || displayName(profile, profile.id)}</p>
                    <p className="break-all text-xs text-muted-foreground">{profile.email}{profile.is_student ? " · Student" : ""}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/admin/user/${profile.id}#student-activity`}>View activity</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Overview based on the most recent 1,000 events and 1,000 sessions in the last 30 days.</p>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading || refreshing} aria-label="Refresh activity overview">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading && <p role="status" className="text-sm text-muted-foreground">Loading activity overview…</p>}
        {overviewError && <p role="alert" className="text-sm text-muted-foreground">Couldn’t load the overview. Student lookup is still available.</p>}
        {!loading && !overviewError && <>
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
        </>}
      </div>
    </AdminShell>
  );
}
