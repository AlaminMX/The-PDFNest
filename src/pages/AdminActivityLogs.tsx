import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import {
  Search, Activity, RefreshCw, LogIn, LogOut, Upload, Trash2,
  Download, Eye, User, Shield, AlertTriangle, ChevronDown, ChevronUp,
  FileText, BookOpen, Sparkles, Pencil, FolderPlus, CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawLog {
  id: string;
  user_id: string;
  activity_type: string;
  details: Record<string, any> | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

interface EnrichedLog extends RawLog {
  user_name: string;
  user_email: string;
}

// ─── Config ────────────────────────────────────────────────────────────────────

/**
 * Activity types that are pure technical noise — suppress from the main feed
 * but still count in stats.
 */
const NOISE_TYPES = new Set([
  "session_start", "session_end", "page_view", "login_failed",
]);

/**
 * Human-readable labels for every known activity type.
 */
const LABELS: Record<string, string> = {
  login:                 "Signed in",
  logout:                "Signed out",
  upload_pdf:            "Uploaded PDF",
  delete_pdf:            "Deleted PDF",
  rename_pdf:            "Renamed PDF",
  download_pdf:          "Downloaded PDF",
  view_pdf:              "Viewed PDF",
  open_pdf:              "Opened PDF",
  ai_summary:            "Used AI Summary",
  ai_study_guide:        "Used Study Guide",
  ai_voice:              "Used Voice Reader",
  ai_translate:          "Translated PDF",
  ai_chat:               "Chatted with PDF",
  category_create:       "Created Category",
  category_delete:       "Deleted Category",
  profile_update:        "Updated Profile",
  avatar_update:         "Updated Profile Photo",
  lecture_note_upload:   "Uploaded Lecture Note",
  lecture_note_view:     "Viewed Lecture Note",
  contribute_upload:     "Contributed Material",
  upload_approved:       "Upload Approved",
  upload_rejected:       "Upload Rejected",
  login_failed:          "Failed Login Attempt",
  admin_action:          "Admin Action",
};

/**
 * Filters shown in the UI — each maps to one or more activity_type values.
 */
const FILTER_GROUPS: { key: string; label: string; types: string[] | null }[] = [
  { key: "all",          label: "All",            types: null },
  { key: "auth",         label: "Auth",           types: ["login", "logout", "login_failed"] },
  { key: "uploads",      label: "Uploads",        types: ["upload_pdf", "lecture_note_upload", "contribute_upload"] },
  { key: "files",        label: "Files",          types: ["download_pdf", "view_pdf", "open_pdf", "delete_pdf", "rename_pdf"] },
  { key: "ai",           label: "AI Features",    types: ["ai_summary", "ai_study_guide", "ai_voice", "ai_translate", "ai_chat"] },
  { key: "admin",        label: "Admin Actions",  types: ["upload_approved", "upload_rejected", "admin_action"] },
  { key: "profile",      label: "Profile",        types: ["profile_update", "avatar_update"] },
  { key: "errors",       label: "Errors",         types: ["login_failed"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function label(type: string): string {
  return LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function actionIcon(type: string) {
  const cls = "w-4 h-4";
  if (type === "login")                      return <LogIn className={cls} />;
  if (type === "logout")                     return <LogOut className={cls} />;
  if (type.startsWith("upload"))             return <Upload className={cls} />;
  if (type.includes("delete"))               return <Trash2 className={cls} />;
  if (type === "download_pdf")               return <Download className={cls} />;
  if (type.includes("view") || type.includes("open")) return <Eye className={cls} />;
  if (type.includes("ai_"))                  return <Sparkles className={cls} />;
  if (type.includes("profile") || type.includes("avatar")) return <User className={cls} />;
  if (type.includes("approved"))             return <CheckCircle className={cls} />;
  if (type.includes("rejected"))             return <XCircle className={cls} />;
  if (type.includes("admin"))                return <Shield className={cls} />;
  if (type === "login_failed")               return <AlertTriangle className={cls} />;
  if (type.includes("rename"))               return <Pencil className={cls} />;
  if (type.includes("category"))             return <FolderPlus className={cls} />;
  if (type.includes("lecture"))              return <BookOpen className={cls} />;
  return <FileText className={cls} />;
}

function actionColor(type: string): string {
  if (type === "login")                   return "text-green-600 bg-green-500/10";
  if (type === "logout")                  return "text-slate-500 bg-slate-500/10";
  if (type.includes("delete") || type.includes("rejected")) return "text-red-500 bg-red-500/10";
  if (type.startsWith("upload") || type.includes("approved")) return "text-blue-500 bg-blue-500/10";
  if (type.includes("ai_"))              return "text-purple-500 bg-purple-500/10";
  if (type === "login_failed")           return "text-amber-500 bg-amber-500/10";
  if (type.includes("admin"))            return "text-orange-500 bg-orange-500/10";
  return "text-muted-foreground bg-muted/50";
}

/**
 * Build the human-readable "what happened" summary from a log entry.
 */
function summarize(log: EnrichedLog): string {
  const d = log.details ?? {};
  const type = log.activity_type;

  if (type === "upload_pdf" && d.fileName)           return `Uploaded "${d.fileName}"`;
  if (type === "delete_pdf" && d.fileName)           return `Deleted "${d.fileName}"`;
  if (type === "rename_pdf" && d.fileName)           return `Renamed to "${d.fileName}"`;
  if (type === "download_pdf" && d.fileName)         return `Downloaded "${d.fileName}"`;
  if (type === "view_pdf" && (d.fileName || d.pdfName)) return `Viewed "${d.fileName || d.pdfName}"`;
  if (type === "lecture_note_upload" && d.courseCode) return `Uploaded notes for ${d.courseCode}`;
  if (type === "lecture_note_view" && d.noteTitle)   return `Viewed "${d.noteTitle}"`;
  if (type === "ai_summary" && d.fileName)           return `Summarised "${d.fileName}"`;
  if (type === "ai_chat" && d.fileName)              return `Chatted with "${d.fileName}"`;
  if (type === "ai_study_guide" && d.fileName)       return `Generated study guide for "${d.fileName}"`;
  if (type === "category_create" && d.categoryName)  return `Created category "${d.categoryName}"`;
  if (type === "category_delete" && d.categoryName)  return `Deleted category "${d.categoryName}"`;
  if (type === "upload_approved" && d.title)         return `Approved "${d.title}"`;
  if (type === "upload_rejected" && d.title)         return `Rejected "${d.title}"`;
  if (type === "login_failed" && d.identifier)       return `Failed attempt for ${d.identifier}`;
  return label(type);
}

function initials(name: string, email: string): string {
  if (name && name !== "Unknown") return name.slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

function displayName(name: string, email: string): string {
  if (name && name !== "Unknown" && name !== "null") return name;
  return email?.split("@")[0] ?? "Unknown User";
}

// ─── Log row ─────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: EnrichedLog }) {
  const [expanded, setExpanded] = useState(false);
  const detail = summarize(log);
  const hasExtra = Object.keys(log.details ?? {}).length > 0 || !!log.user_agent;

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0">
      <div className="flex items-start gap-3">
        {/* Action icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${actionColor(log.activity_type)}`}>
          {actionIcon(log.activity_type)}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium text-sm text-foreground">
              {displayName(log.user_name, log.user_email)}
            </span>
            <span className="text-sm text-muted-foreground">{detail}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground/70">
            <span title={format(new Date(log.created_at), "PPpp")}>
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
            <span className="hidden sm:inline">{log.user_email}</span>
          </div>
        </div>

        {/* Expand technical details */}
        {hasExtra && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Collapsible technical details */}
      {expanded && (
        <div className="mt-2 ml-11 p-3 rounded-lg bg-muted/30 text-xs space-y-1 text-muted-foreground font-mono">
          {log.user_agent && (
            <p className="truncate"><span className="text-foreground/60">device:</span> {log.user_agent.split(" ").slice(0, 4).join(" ")}</p>
          )}
          {Object.entries(log.details ?? {}).map(([k, v]) => (
            <p key={k} className="truncate">
              <span className="text-foreground/60">{k}:</span> {String(v)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminActivityLogs() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const [logs, setLogs] = useState<EnrichedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin]);

  const fetchLogs = useCallback(async () => {
    try {
      // Single query — get recent 600 events
      const { data: raw, error } = await supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(600);

      if (error) throw error;

      // Batch-fetch all referenced user profiles
      const uids = [...new Set((raw || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uids);

      const pmap = new Map((profiles || []).map(p => [p.id, p]));

      // Deduplicate noisy back-to-back same-user same-type events
      // Keep first occurrence within 60-second windows
      const seen = new Map<string, number>(); // key → last timestamp ms
      const deduped: EnrichedLog[] = [];

      for (const r of (raw || []) as RawLog[]) {
        const p = pmap.get(r.user_id);
        const ts = new Date(r.created_at).getTime();
        const key = `${r.user_id}:${r.activity_type}`;
        const lastSeen = seen.get(key) ?? 0;

        // Suppress duplicate noise events within 60s, page_view within 10s
        const windowMs = r.activity_type === "page_view" ? 10_000 : 60_000;
        if (ts - lastSeen < windowMs && NOISE_TYPES.has(r.activity_type)) continue;
        seen.set(key, ts);

        deduped.push({
          ...r,
          details: (typeof r.details === "object" && r.details !== null)
            ? r.details as Record<string, any>
            : {},
          user_name:  p?.full_name  ?? "Unknown",
          user_email: p?.email      ?? "Unknown",
        });
      }

      setLogs(deduped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    await fetchLogs();
    setRefreshing(false);
    toast.success("Refreshed");
  };

  // Stats
  const stats = useMemo(() => {
    const allRaw = logs; // includes noise types
    return {
      total:        allRaw.filter(l => !NOISE_TYPES.has(l.activity_type)).length,
      today:        allRaw.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
      uploads:      allRaw.filter(l => l.activity_type.includes("upload")).length,
      failedLogins: allRaw.filter(l => l.activity_type === "login_failed").length,
    };
  }, [logs]);

  // Filtered + searched list
  const visible = useMemo(() => {
    const group = FILTER_GROUPS.find(g => g.key === filterKey);
    let result = logs;

    // Filter: hide noise from "all" tab
    if (filterKey === "all") {
      result = result.filter(l => !NOISE_TYPES.has(l.activity_type));
    } else if (group?.types) {
      result = result.filter(l => group.types!.includes(l.activity_type));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.user_name.toLowerCase().includes(q) ||
        l.user_email.toLowerCase().includes(q) ||
        label(l.activity_type).toLowerCase().includes(q) ||
        summarize(l).toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, filterKey, search]);

  if (adminLoading || loading) return <LoadingState message="Loading activity logs…" />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader
        title="Activity Logs"
        subtitle="What users have been doing on PDFNest"
        showBack
        backTo="/admin"
        icon={<Activity className="h-5 w-5 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Meaningful events", value: stats.total },
            { label: "Today",             value: stats.today },
            { label: "Uploads",           value: stats.uploads },
            { label: "Failed logins",     value: stats.failedLogins, warn: stats.failedLogins > 0 },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.warn ? "text-amber-500" : ""}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* ── Search + refresh ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              placeholder="Search by name, email, or action…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_GROUPS.map(g => (
            <button
              key={g.key}
              onClick={() => setFilterKey(g.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterKey === g.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        <p className="text-xs text-muted-foreground">
          {visible.length} {visible.length === 1 ? "event" : "events"}
          {(search || filterKey !== "all") && ` · filtered from ${logs.filter(l => !NOISE_TYPES.has(l.activity_type)).length} total`}
        </p>

        {/* ── Log feed ── */}
        <Card className="overflow-hidden divide-y divide-border/20">
          {visible.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-8 w-8 text-muted-foreground" />}
              title="No activity found"
              description={search || filterKey !== "all" ? "Try a different filter or search term." : "Activity will appear here as users interact with the platform."}
            />
          ) : (
            visible.map(log => <LogRow key={log.id} log={log} />)
          )}
        </Card>
      </main>
    </div>
  );
}