import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRepStatus } from "@/hooks/useRepStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface CommunityUploadRow {
  id: string;
  title: string;
  original_file_name: string;
  file_size: number;
  file_path: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  uploader_name?: string | null;
  course_code?: string | null;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

export function RepModeration() {
  const navigate = useNavigate();
  const { isRep, departmentId, departmentName, loading: repLoading } = useRepStatus();
  const [uploads, setUploads] = useState<CommunityUploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  useEffect(() => {
    if (!repLoading && !isRep) {
      toast.error("Only course reps can access moderation.");
      navigate("/");
    }
  }, [repLoading, isRep, navigate]);

  useEffect(() => {
    if (isRep && departmentId) {
      void fetchUploads();
    }
  }, [isRep, departmentId, statusFilter]);

  const fetchUploads = async () => {
    if (!departmentId) return;

    try {
      setLoading(true);
      let query = (supabase as any)
        .from("community_uploads")
        .select(`
          id,
          title,
          original_file_name,
          file_size,
          file_path,
          status,
          review_note,
          created_at,
          profiles!community_uploads_user_id_fkey (display_name, full_name),
          courses (code)
        `)
        .eq("department_id", departmentId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setUploads((data || []).map((row: any) => ({
        ...row,
        uploader_name: row.profiles?.display_name || row.profiles?.full_name || "Unknown",
        course_code: row.courses?.code || null,
      })));
    } catch (error: any) {
      console.error("Error loading moderation queue:", error);
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
      const { data: userData } = await supabase.auth.getUser();
      const reviewerId = userData.user?.id;
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
      console.error(`Failed to ${action}:`, error);
      toast.error(error.message || `Failed to ${action} upload`);
    } finally {
      setActingId(null);
    }
  };

  const pendingCount = useMemo(() => uploads.filter((u) => u.status === "pending").length, [uploads]);

  if (repLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Department Upload Review</h1>
            <p className="text-xs text-muted-foreground">{departmentName || "Your department"}</p>
          </div>
          <Badge variant="secondary">{pendingCount} pending</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="max-w-xs">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {uploads.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No uploads found for this status.
            </CardContent>
          </Card>
        ) : (
          uploads.map((upload) => (
            <Card key={upload.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{upload.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {upload.uploader_name} • {upload.course_code || "No course"}
                    </p>
                  </div>
                  <Badge variant={upload.status === "approved" ? "default" : upload.status === "rejected" ? "destructive" : "secondary"}>
                    {upload.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                  <span>{upload.original_file_name}</span>
                  <span>{formatBytes(upload.file_size)}</span>
                  <span>{new Date(upload.created_at).toLocaleString()}</span>
                </div>

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
      </main>
    </div>
  );
}


export default RepModeration;
