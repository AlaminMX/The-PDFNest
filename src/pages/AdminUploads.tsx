import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useCommunityUploads, CommunityUpload } from "@/hooks/useCommunityUploads";
import { useDepartments } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft, Search, CheckCircle, XCircle, Eye, Loader2,
  FileText, Filter, Building2, Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

function PreviewButton({ filePath }: { filePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (url) { window.open(url, "_blank"); return; }
    setLoading(true);
    const { data } = await supabase.storage
      .from("school_pdfs")
      .createSignedUrl(filePath, 300); // 5 min
    setLoading(false);
    if (data?.signedUrl) {
      setUrl(data.signedUrl);
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Could not generate preview link");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handlePreview} disabled={loading} title="Preview file">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
    </Button>
  );
}

interface ReviewDialogProps {
  upload: CommunityUpload | null;
  action: "approve" | "reject" | null;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}

const APPROVAL_MESSAGES = [
  (name: string) => `Great work, ${name}! Your upload has been approved and is now live.`,
  (name: string) => `Thanks for contributing, ${name}! Your material is now available to students.`,
  (name: string) => `Approved! Well done, ${name} — this will really help your department.`,
  (name: string) => `${name}, your upload has been reviewed and approved. Keep it up!`,
  (name: string) => `Excellent contribution, ${name}! Your file is now published.`,
];

function getAutoApprovalMessage(uploaderName: string): string {
  const fn = APPROVAL_MESSAGES[Math.floor(Math.random() * APPROVAL_MESSAGES.length)];
  return fn(uploaderName || "contributor");
}

function ReviewDialog({ upload, action, onConfirm, onCancel, loading }: ReviewDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!upload) { setNote(""); return; }
    if (action === "approve") {
      setNote(getAutoApprovalMessage(upload.uploader_name || "contributor"));
    } else {
      setNote("");
    }
  }, [upload, action]);

  if (!upload || !action) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", action === "approve" ? "text-green-600" : "text-destructive")}>
            {action === "approve"
              ? <><CheckCircle className="w-5 h-5" /> Approve Upload</>
              : <><XCircle className="w-5 h-5" /> Reject Upload</>
            }
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{upload.title}</span>
            <span className="text-muted-foreground"> by {upload.uploader_name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="review-note" className="text-sm">
              {action === "reject" ? "Reason (recommended)" : "Note (optional)"}
            </Label>
            <Textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "reject"
                  ? "e.g. Duplicate file, low quality, wrong course..."
                  : "e.g. Great material, thanks!"
              }
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button
            onClick={() => onConfirm(note)}
            disabled={loading}
            variant={action === "approve" ? "default" : "destructive"}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUploads() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const { departments } = useDepartments();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { uploads, loading, refetch, approveUpload, rejectUpload } = useCommunityUploads({
    scope: "admin",
    statusFilter,
  });

  const [reviewTarget, setReviewTarget] = useState<CommunityUpload | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/admin");
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleReview = (upload: CommunityUpload, action: "approve" | "reject") => {
    setReviewTarget(upload);
    setReviewAction(action);
  };

  const handleConfirmReview = async (note: string) => {
    if (!reviewTarget || !reviewAction) return;
    setReviewLoading(true);
    try {
      if (reviewAction === "approve") {
        await approveUpload(reviewTarget.id, note);
        toast.success("Upload approved and added to lecture notes!");
      } else {
        await rejectUpload(reviewTarget.id, note);
        toast.success("Upload rejected.");
      }
      setReviewTarget(null);
      setReviewAction(null);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setReviewLoading(false);
    }
  };

  // Filter uploads by department and search
  const filtered = uploads.filter((u) => {
    const matchesDept = deptFilter === "all" || u.department_id === deptFilter;
    const matchesSearch =
      !searchQuery ||
      u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uploader_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.course_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const pendingCount = uploads.filter((u) => u.status === "pending").length;

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 md:px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Community Uploads</h1>
              <p className="text-xs text-muted-foreground">
                Review and moderate user-submitted materials
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search + department filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, uploader, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${filtered.length} upload${filtered.length !== 1 ? "s" : ""}`}
        </p>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">No uploads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title / Uploader</TableHead>
                    <TableHead className="hidden md:table-cell">Course</TableHead>
                    <TableHead className="hidden lg:table-cell">Department</TableHead>
                    <TableHead className="hidden md:table-cell">Size</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm leading-tight line-clamp-1">{upload.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{upload.uploader_name}</p>
                          {upload.review_note && (
                            <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">
                              Note: {upload.review_note}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        <div>{upload.course_code || "—"}</div>
                        {upload.level && (
                          <div className="text-[11px] text-muted-foreground/60">{upload.level}L · {upload.material_type?.replace("_"," ")}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {upload.department_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatBytes(upload.file_size)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {upload.created_at ? format(new Date(upload.created_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={upload.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <PreviewButton filePath={upload.file_path} />
                          {upload.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                onClick={() => handleReview(upload, "approve")}
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleReview(upload, "reject")}
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <ReviewDialog
        upload={reviewTarget}
        action={reviewAction}
        onConfirm={handleConfirmReview}
        onCancel={() => { setReviewTarget(null); setReviewAction(null); }}
        loading={reviewLoading}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
    case "approved":
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
    case "rejected":
      return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
