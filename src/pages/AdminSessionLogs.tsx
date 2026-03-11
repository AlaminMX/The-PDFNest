import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Activity, AlertTriangle, Clock, Database, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface ActivityEvent {
  id: string;
  timestamp: string;
  user_id: string;
  session_id: string;
  action: string;
  resource: string;
  status: string;
  context: Record<string, unknown>;
}

interface FailedLoginEvent {
  id: number;
  identifier: string;
  attempted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  context: Record<string, unknown>;
}

interface SessionSummary {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  event_count: number;
  error_count: number;
  security_count: number;
}

const ACTION_FILTERS = [
  "ALL",
  "PAGE_VIEW",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "MULTI_FAILED_LOGIN",
  "FILE_UPLOAD",
  "FILE_DOWNLOAD",
  "FILE_DELETE",
  "AI_SUMMARY_GENERATE",
  "AI_CHAT_ASK",
] as const;

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

function shortId(value: string): string {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function AdminSessionLogs() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [failedLoginEvents, setFailedLoginEvents] = useState<FailedLoginEvent[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      void fetchAllLogs();
    }
  }, [isAdmin]);

  const fetchAllLogs = async () => {
    try {
      setLoading(true);

      const actionParam = actionFilter === "ALL" ? null : actionFilter;
      const searchParam = searchQuery.trim() ? searchQuery.trim() : null;

      const [eventsRes, sessionsRes] = await Promise.all([
        supabase
          .from("user_activity_logs")
          .select("id, activity_type, details, created_at, user_id, ip_address, user_agent")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("user_sessions")
          .select("id, user_id, login_at, logout_at, is_active, duration_seconds, user_agent")
          .order("login_at", { ascending: false })
          .limit(300),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      const rawEvents = eventsRes.data || [];
      const mappedEvents: ActivityEvent[] = rawEvents.map((e: any) => ({
        id: e.id,
        timestamp: e.created_at,
        user_id: e.user_id,
        session_id: (e.details as any)?.session_id || "",
        action: e.activity_type,
        resource: (e.details as any)?.resource || "",
        status: (e.details as any)?.status || "ok",
        context: (e.details as Record<string, unknown>) || {},
      }));

      const mappedFailed: FailedLoginEvent[] = rawEvents
        .filter((e: any) => e.activity_type === "login_failed")
        .map((e: any, i: number) => ({
          id: i,
          identifier: (e.details as any)?.identifier || e.user_id,
          attempted_at: e.created_at,
          ip_address: e.ip_address,
          user_agent: e.user_agent,
          session_id: (e.details as any)?.session_id || null,
          context: (e.details as Record<string, unknown>) || {},
        }));

      const mappedSessions: SessionSummary[] = (sessionsRes.data || []).map((s: any) => ({
        session_id: s.id,
        user_id: s.user_id,
        started_at: s.login_at,
        ended_at: s.logout_at || "",
        event_count: 0,
        error_count: 0,
        security_count: 0,
      }));

      setActivityEvents(mappedEvents);
      setFailedLoginEvents(mappedFailed);
      setSessionSummaries(mappedSessions);
    } catch (error) {
      console.error("Failed to fetch activity logs", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllLogs();
    setRefreshing(false);
    toast.success("Activity logs refreshed");
  };

  const stats = useMemo(() => {
    const total = activityEvents.length;
    const failed = activityEvents.filter((event) => event.action === "LOGIN_FAILED").length;
    const securityAlerts = activityEvents.filter((event) => event.action === "MULTI_FAILED_LOGIN").length;
    const activeSessions = sessionSummaries.filter((session) => {
      const endedAt = new Date(session.ended_at).getTime();
      return Date.now() - endedAt < 15 * 60 * 1000;
    }).length;

    return { total, failed, securityAlerts, activeSessions };
  }, [activityEvents, sessionSummaries]);

  if (adminLoading || loading) {
    return <LoadingState message="Loading activity logs..." />;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Activity Logs"
        subtitle="Complete structured audit trail: events, sessions, and security signals"
        showBack
        icon={<Database className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Failed Logins</p>
            <p className="text-2xl font-bold text-amber-500">{stats.failed}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Security Alerts</p>
            <p className="text-2xl font-bold text-red-500">{stats.securityAlerts}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Recent Sessions</p>
            <p className="text-2xl font-bold">{stats.activeSessions}</p>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search user, action, status, resource, context, or session..."
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full lg:w-[220px]">
              <SelectValue placeholder="Filter action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTERS.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void fetchAllLogs()}>
            <Search className="h-4 w-4 mr-2" />
            Apply
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events"><Activity className="h-4 w-4 mr-2" />Events</TabsTrigger>
            <TabsTrigger value="sessions"><Clock className="h-4 w-4 mr-2" />Sessions</TabsTrigger>
            <TabsTrigger value="security"><ShieldAlert className="h-4 w-4 mr-2" />Security</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card className="p-4">
              {activityEvents.length === 0 ? (
                <EmptyState
                  icon={<Activity className="h-8 w-8 text-muted-foreground" />}
                  title="No activity events"
                  description="No events match your current filters"
                />
              ) : (
                <ScrollArea className="h-[70vh] pr-2">
                  <Accordion type="multiple" className="w-full">
                    {activityEvents.map((event) => (
                      <AccordionItem key={event.id} value={event.id}>
                        <AccordionTrigger>
                          <div className="flex flex-wrap items-center gap-2 text-left">
                            <Badge variant="outline">{event.action}</Badge>
                            <Badge variant={event.status === "SUCCESS" ? "default" : "destructive"}>{event.status}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                            <span className="text-xs text-muted-foreground">user: {shortId(event.user_id)}</span>
                            <span className="text-xs text-muted-foreground">session: {shortId(event.session_id)}</span>
                            <span className="text-xs">{event.resource}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                            {JSON.stringify(event.context || {}, null, 2)}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card className="p-4">
              {sessionSummaries.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                  title="No session summaries"
                  description="Session summaries will appear once events are captured"
                />
              ) : (
                <div className="space-y-3">
                  {sessionSummaries.map((session) => (
                    <Card key={session.session_id} className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline">{shortId(session.session_id)}</Badge>
                        <span className="text-sm">user: {shortId(session.user_id)}</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <p><span className="text-muted-foreground">Started:</span> {formatDateTime(session.started_at)}</p>
                        <p><span className="text-muted-foreground">Ended:</span> {formatDateTime(session.ended_at)}</p>
                        <p><span className="text-muted-foreground">Events:</span> {session.event_count}</p>
                        <p><span className="text-muted-foreground">Errors/Alerts:</span> {session.error_count}</p>
                        <p><span className="text-muted-foreground">Security Signals:</span> {session.security_count}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="p-4">
              {failedLoginEvents.length === 0 ? (
                <EmptyState
                  icon={<AlertTriangle className="h-8 w-8 text-muted-foreground" />}
                  title="No failed login records"
                  description="Failed login attempts will be listed here"
                />
              ) : (
                <ScrollArea className="h-[70vh] pr-2">
                  <div className="space-y-3">
                    {failedLoginEvents.map((event) => (
                      <Card key={event.id} className="p-3">
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <Badge variant="destructive">LOGIN_FAILED</Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(event.attempted_at)}</span>
                          <span className="text-xs">identifier: {event.identifier}</span>
                          {event.session_id && <span className="text-xs text-muted-foreground">session: {shortId(event.session_id)}</span>}
                        </div>
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground">IP:</span> {event.ip_address || "—"}</p>
                          <p><span className="text-muted-foreground">User Agent:</span> {event.user_agent || "—"}</p>
                          <pre className="bg-muted p-2 rounded-md overflow-x-auto">{JSON.stringify(event.context || {}, null, 2)}</pre>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
