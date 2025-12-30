import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Search, Activity, Filter, Calendar, User, RefreshCw, Clock, ChevronDown, ChevronRight, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getActivityDisplayName, formatDuration } from "@/lib/sessionLogger";

interface SessionActivity {
  type: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface UserSession {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  activities: SessionActivity[];
  activity_summary: Record<string, number>;
  user_email?: string;
  user_name?: string;
}

type SessionFilter = "all" | "active" | "completed" | "long" | "short";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSessionLogs() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSessions();
    }
  }, [isAdmin]);

  const fetchSessions = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("*")
        .order("login_at", { ascending: false })
        .limit(200);

      if (sessionsError) throw sessionsError;

      // Get unique user IDs
      const userIds = [...new Set(sessionsData?.map(s => s.user_id) || [])];

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, display_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Map profiles by ID
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { 
          email: p.email, 
          name: p.display_name || p.full_name 
        }]) || []
      );

      // Combine sessions with user info
      const enrichedSessions: UserSession[] = (sessionsData || []).map(session => ({
        ...session,
        activities: Array.isArray(session.activities) ? session.activities as unknown as SessionActivity[] : [],
        activity_summary: (typeof session.activity_summary === 'object' && session.activity_summary !== null) 
          ? session.activity_summary as Record<string, number> 
          : {},
        user_email: profilesMap.get(session.user_id)?.email || "Unknown",
        user_name: profilesMap.get(session.user_id)?.name || undefined
      }));

      setSessions(enrichedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load session logs");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
    toast.success("Sessions refreshed");
  };

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.user_email?.toLowerCase().includes(query) ||
        session.user_name?.toLowerCase().includes(query)
      );
    }

    // Apply session filter
    switch (sessionFilter) {
      case "active":
        filtered = filtered.filter(s => s.is_active);
        break;
      case "completed":
        filtered = filtered.filter(s => !s.is_active);
        break;
      case "long":
        filtered = filtered.filter(s => (s.duration_seconds || 0) > 1800); // > 30 min
        break;
      case "short":
        filtered = filtered.filter(s => s.duration_seconds !== null && s.duration_seconds < 300); // < 5 min
        break;
    }

    return filtered;
  }, [sessions, searchQuery, sessionFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeSessions = sessions.filter(s => s.is_active).length;
    const todaySessions = sessions.filter(s => 
      new Date(s.login_at).toDateString() === new Date().toDateString()
    ).length;
    const completedSessions = sessions.filter(s => !s.is_active && s.duration_seconds);
    const avgDuration = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / completedSessions.length)
      : 0;
    const totalAIUsage = sessions.reduce((acc, s) => {
      const summary = s.activity_summary || {};
      return acc + (summary.ai_summary || 0) + (summary.ai_chat || 0) + (summary.ai_study_guide || 0) + (summary.ai_voice || 0) + (summary.ai_translate || 0);
    }, 0);

    return { activeSessions, todaySessions, avgDuration, totalAIUsage };
  }, [sessions]);

  if (adminLoading || loading) {
    return <LoadingState message="Loading session logs..." />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Session Logs"
        subtitle="Track user sessions and activities"
        showBack
        icon={<Activity className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Active Now</p>
            <p className="text-2xl font-bold text-green-500">{stats.activeSessions}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Today's Sessions</p>
            <p className="text-2xl font-bold">{stats.todaySessions}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg Duration</p>
            <p className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">AI Feature Uses</p>
            <p className="text-2xl font-bold">{stats.totalAIUsage}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sessionFilter} onValueChange={(v) => setSessionFilter(v as SessionFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="active">Active Now</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="long">Long (&gt;30min)</SelectItem>
              <SelectItem value="short">Short (&lt;5min)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Results count */}
        {(searchQuery || sessionFilter !== "all") && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </p>
        )}

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={<Activity className="h-8 w-8 text-muted-foreground" />}
                title="No sessions found"
                description={searchQuery || sessionFilter !== "all" 
                  ? "No sessions match your filters" 
                  : "User sessions will appear here once logged"}
              />
            </Card>
          ) : (
            filteredSessions.map((session) => (
              <Card key={session.id} className="overflow-hidden">
                <Collapsible 
                  open={expandedSessions.has(session.id)}
                  onOpenChange={() => toggleSession(session.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {expandedSessions.has(session.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">
                            {session.user_name || session.user_email?.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.user_email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                          <LogIn className="h-4 w-4" />
                          <span>{formatDate(session.login_at)}</span>
                        </div>

                        {session.logout_at && (
                          <div className="hidden lg:flex items-center gap-2 text-muted-foreground">
                            <LogOut className="h-4 w-4" />
                            <span>{formatTime(session.logout_at)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatDuration(session.duration_seconds)}
                          </span>
                        </div>

                        <Badge variant={session.is_active ? "default" : "secondary"}>
                          {session.is_active ? "Active" : "Ended"}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/30 p-4">
                      {/* Activity Summary */}
                      {Object.keys(session.activity_summary || {}).length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Activity Summary</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(session.activity_summary).map(([type, count]) => (
                              <Badge key={type} variant="outline">
                                {getActivityDisplayName(type)}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Activity Timeline */}
                      {session.activities.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium mb-2">Activity Timeline</p>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {session.activities.slice().reverse().map((activity, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md bg-background"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground text-xs">
                                    {formatTime(activity.timestamp)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {getActivityDisplayName(activity.type)}
                                  </Badge>
                                </div>
                                {activity.details && Object.keys(activity.details).length > 0 && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {activity.details.fileName || activity.details.pdfName || activity.details.page || ""}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No activities recorded in this session</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </main>

      <footer className="mt-auto py-6 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            Made with love ❤️ by Nexel
          </p>
        </div>
      </footer>
    </div>
  );
}
