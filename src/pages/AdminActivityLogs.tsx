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
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { Search, Activity, Filter, Calendar, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getActivityDisplayName } from "@/lib/activityLogger";

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  details: Record<string, any> | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

type ActivityFilter = "all" | "login" | "upload_pdf" | "delete_pdf" | "download_pdf" | "ai_summary" | "ai_study_guide" | "ai_chat";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityBadgeVariant(activityType: string): "default" | "secondary" | "destructive" | "outline" {
  if (activityType.includes("delete")) return "destructive";
  if (activityType.includes("ai_")) return "default";
  if (activityType.includes("upload")) return "secondary";
  return "outline";
}

export default function AdminActivityLogs() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    try {
      // Fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Get unique user IDs
      const userIds = [...new Set(logsData?.map(log => log.user_id) || [])];

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Map profiles by ID
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { email: p.email, name: p.full_name }]) || []
      );

      // Combine logs with user info
      const enrichedLogs: ActivityLog[] = (logsData || []).map(log => ({
        ...log,
        details: (typeof log.details === 'object' && log.details !== null) ? log.details as Record<string, any> : {},
        user_email: profilesMap.get(log.user_id)?.email || "Unknown",
        user_name: profilesMap.get(log.user_id)?.name || undefined
      }));

      setLogs(enrichedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
    toast.success("Logs refreshed");
  };

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.user_email?.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query) ||
        log.activity_type.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
      );
    }

    // Apply activity type filter
    if (activityFilter !== "all") {
      filtered = filtered.filter(log => log.activity_type === activityFilter);
    }

    return filtered;
  }, [logs, searchQuery, activityFilter]);

  if (adminLoading || loading) {
    return <LoadingState message="Loading activity logs..." />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Activity Logs"
        subtitle="Track user activity across the platform"
        showBack
        icon={<Activity className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Uploads</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => l.activity_type === "upload_pdf").length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">AI Features</p>
            <p className="text-2xl font-bold">
              {logs.filter(l => l.activity_type.startsWith("ai_")).length}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, activity, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as ActivityFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="upload_pdf">Uploads</SelectItem>
              <SelectItem value="delete_pdf">Deletions</SelectItem>
              <SelectItem value="download_pdf">Downloads</SelectItem>
              <SelectItem value="ai_summary">AI Summary</SelectItem>
              <SelectItem value="ai_study_guide">Study Guide</SelectItem>
              <SelectItem value="ai_chat">AI Chat</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Results count */}
        {(searchQuery || activityFilter !== "all") && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} events
          </p>
        )}

        {/* Logs Table */}
        <Card className="overflow-hidden">
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-8 w-8 text-muted-foreground" />}
              title="No activity logs"
              description={searchQuery || activityFilter !== "all" 
                ? "No logs match your filters" 
                : "User activity will appear here once logged"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(log.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">
                            {log.user_name || log.user_email?.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {log.user_email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActivityBadgeVariant(log.activity_type)}>
                        {getActivityDisplayName(log.activity_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px]">
                      {Object.keys(log.details || {}).length > 0 ? (
                        <div className="text-sm text-muted-foreground truncate">
                          {log.details.fileName && <span>File: {log.details.fileName}</span>}
                          {log.details.pdfName && <span>PDF: {log.details.pdfName}</span>}
                          {log.details.categoryName && <span>Category: {log.details.categoryName}</span>}
                          {!log.details.fileName && !log.details.pdfName && !log.details.categoryName && (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
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
