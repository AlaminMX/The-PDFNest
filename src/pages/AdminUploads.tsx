import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

type UploadStatus = "pending" | "approved" | "rejected";
type DateFilter = "all" | "today" | "week" | "month";

interface CommunityUploadRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  original_file_name: string;
  file_size: number;
  file_path: string;
  status: UploadStatus;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  course_id: string | null;
  department_id: string | null;
  reviewer_name?: string | null;
  uploader_name?: string | null;
  course_code?: string | null;
  course_name?: string | null;
  department_name?: string | null;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export default function AdminUploads() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [uploads, setUploads] = useState<CommunityUploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | UploadStatus>("pending");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      void fetchUploads();
    }
  }, [isAdmin]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("community_uploads")
        .select(`
          id,
          user_id,
          title,
          description,
          original_file_name,
          file_size,
          file_path,
          status,
          review_note,
          created_at,
          reviewed_at,
          course_id,
          department_id,
          profiles!community_uploads_user_id_fkey (display_name, full_name),
          courses (code, name),
          departments (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        ...row,
        uploader_name: row.profiles?.display_name || row.profiles?.full_name || "Unknown",
        course_code: row.courses?.code || null,
        course_name: row.courses?.name || null,
        department_name: row.departments?.name || null,
      }));
      setUploads(mapped);
    } catch (error: any) {
      console.error("Error fetching uploads:", error);
      toast.error(error.message || "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from("school_pdfs").createSignedUrl(filePath, 300);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error: any) {
      toast.error(error.message || "Unable to preview file");
    }
  };

  const moderateUpload = async (uploadId: string, action: "approve" | "reject") => {
    const note = window.prompt(`Optional review note for ${action}:`) || null;

    try {
      setActingId(uploadId);
      const { data: sessionData } = await supabase.auth.getUser();
      const reviewerId = sessionData.user?.id;
      if (!reviewerId) {
        toast.error("You must be logged in.");
        return;
      }

      const rpcName = action === "approve" ? "approve_community_upload" : "reject_community_upload";
      const { error } = await (supabase as any).rpc(rpcName, {
        p_upload_id: uploadId,
        p_reviewer_id: reviewerId,
        p_note: note,
      });

      if (error) throw error;

      toast.success(`Upload ${action}d successfully.`);
      await fetchUploads();
    } catch (error: any) {
      console.error(`Failed to ${action} upload:`, error);
      toast.error(error.message || `Failed to ${action} upload`);
    } finally {
      setActingId(null);
    }
  };

  const departmentOptions = useMemo(() => {
    return Array.from(new Set(uploads.map((u) => u.department_name).filter(Boolean))) as string[];
  }, [uploads]);

  const filteredUploads = useMemo(() => {
    const now = new Date();

    return uploads.filter((upload) => {
      if (statusFilter !== "all" && upload.status !== statusFilter) return false;
      if (departmentFilter !== "all" && upload.department_name !== departmentFilter) return false;

      if (dateFilter !== "all") {
        const createdAt = new Date(upload.created_at);
        const diffMs = now.getTime() - createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === "today" && diffDays > 1) return false;
        if (dateFilter === "week" && diffDays > 7) return false;
        if (dateFilter === "month" && diffDays > 31) return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${upload.title} ${upload.uploader_name || ""} ${upload.course_code || ""} ${upload.department_name || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [uploads, statusFilter, departmentFilter, dateFilter, search]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Pending Uploads</h1>
            <p className="text-xs text-muted-foreground">Review community submitted materials</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 space-y-4 pb-24">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Search title, uploader, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departmentOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 31 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filteredUploads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No uploads found for current filters.
              </CardContent>
            </Card>
          ) : (
            filteredUploads.map((upload) => (
              <Card key={upload.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{upload.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {upload.uploader_name} • {upload.department_name || "No dept"} • {upload.course_code || "No course"}
                      </p>
                    </div>
                    <Badge variant={upload.status === "approved" ? "default" : upload.status === "rejected" ? "destructive" : "secondary"}>
                      {upload.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>File: {upload.original_file_name}</span>
                    <span>Size: {formatBytes(upload.file_size)}</span>
                    <span>Submitted: {new Date(upload.created_at).toLocaleString()}</span>
                  </div>

                  {upload.description && (
                    <p className="text-sm text-foreground/90">{upload.description}</p>
                  )}

                  {upload.review_note && (
                    <p className="text-xs rounded-md border px-2 py-1 bg-muted/40">
                      Review note: {upload.review_note}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(upload.file_path)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={actingId === upload.id || upload.status === "approved"}
                      onClick={() => moderateUpload(upload.id, "approve")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={actingId === upload.id || upload.status === "rejected"}
                      onClick={() => moderateUpload(upload.id, "reject")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
