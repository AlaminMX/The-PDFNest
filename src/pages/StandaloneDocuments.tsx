import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Eye, FileText, Loader2, Pencil, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PDFViewer } from "@/components/PDFViewer";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";
import { supabase } from "@/integrations/supabase/client";
import { getThumbnailSignedUrl, uploadStandaloneThumbnail } from "@/lib/pdfThumbnails";


type SectionSlug = "books" | "journals";
type StandaloneCategory = "book" | "journal";

type StandaloneDocument = {
  id: string;
  department_id: string;
  category: StandaloneCategory;
  title: string;
  file_path: string;
  file_size: number;
  thumbnail_path: string | null;
  thumbnail_url?: string | null;
  created_at: string;
};

type UploadItem = {
  id: string;
  file: File;
  title: string;
  progress: number;
  status: "pending" | "uploading" | "thumbnail" | "success" | "error";
  error?: string;
};

const SECTION_COPY: Record<SectionSlug, { label: string; category: StandaloneCategory }> = {
  books: { label: "Books", category: "book" },
  journals: { label: "Journals", category: "journal" },
};

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function StandaloneDocuments() {
  const navigate = useNavigate();
  const { deptSlug, section } = useParams<{ deptSlug: string; section: SectionSlug }>();
  const activeSection = section && SECTION_COPY[section] ? SECTION_COPY[section] : null;
  const { data: currentDept, isLoading: deptLoading } = useDepartmentBySlug(deptSlug);
  const { isAdmin } = useAdminStatus();
  const [documents, setDocuments] = useState<StandaloneDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; title: string; size: number; id: string; filePath: string; thumbnailPath: string | null } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StandaloneDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pageTitle = activeSection?.label || "Documents";


  const loadDocuments = useCallback(async () => {
    if (!currentDept?.id || !activeSection) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("standalone_documents" as any)
      .select("id, department_id, category, title, file_path, file_size, thumbnail_path, created_at")
      .eq("department_id", currentDept.id)
      .eq("category", activeSection.category)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load documents");
      setDocuments([]);
    } else {
      const rows = (data || []) as unknown as StandaloneDocument[];
      const rowsWithThumbnails = await Promise.all(
        rows.map(async (document) => ({
          ...document,
          thumbnail_url: await getThumbnailSignedUrl(document.thumbnail_path),
        })),
      );
      setDocuments(rowsWithThumbnails);
    }
    setLoading(false);
  }, [activeSection, currentDept?.id]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const addFiles = (files: File[]) => {
    const pdfs = files.filter((file) => {
      const ok = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!ok) toast.error(`${file.name} is not a PDF`);
      return ok;
    });

    setUploadQueue((current) => [
      ...current,
      ...pdfs.map((file) => ({
        id: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.pdf$/i, ""),
        progress: 0,
        status: "pending" as const,
      })),
    ]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isAdmin || isUploading) return;
    addFiles(Array.from(event.dataTransfer.files || []));
  };

  const updateQueueItem = (id: string, patch: Partial<UploadItem>) => {
    setUploadQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadOne = async (item: UploadItem) => {
    if (!currentDept || !activeSection) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      updateQueueItem(item.id, { status: "uploading", progress: 8 });
      timer = setInterval(() => {
        setUploadQueue((current) =>
          current.map((queued) =>
            queued.id === item.id && queued.progress < 82
              ? { ...queued, progress: queued.progress + Math.random() * 8 + 3 }
              : queued,
          ),
        );
      }, 350);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const storagePath = `standalone/${currentDept.id}/${activeSection.category}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("school_pdfs")
        .upload(storagePath, item.file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      if (timer) clearInterval(timer);
      updateQueueItem(item.id, { progress: 88, status: "thumbnail" });

      const { data: inserted, error: insertError } = await supabase
        .from("standalone_documents" as any)
        .insert({
          department_id: currentDept.id,
          category: activeSection.category,
          title: item.title.trim() || item.file.name.replace(/\.pdf$/i, ""),
          file_path: storagePath,
          file_size: item.file.size,
          uploaded_by: user.id,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const documentId = (inserted as any).id as string;
      const thumbnailPath = await uploadStandaloneThumbnail(item.file, documentId);
      if (thumbnailPath) {
        await supabase
          .from("standalone_documents" as any)
          .update({ thumbnail_path: thumbnailPath })
          .eq("id", documentId);
      }

      updateQueueItem(item.id, { progress: 100, status: "success" });
    } catch (error) {
      if (timer) clearInterval(timer);
      updateQueueItem(item.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const uploadAll = async () => {
    const pending = uploadQueue.filter((item) => item.status === "pending" || item.status === "error");
    if (pending.length === 0) return;
    setIsUploading(true);
    let cursor = 0;
    const concurrency = Math.min(3, pending.length);
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (cursor < pending.length) {
          const next = pending[cursor++];
          await uploadOne(next);
        }
      }),
    );
    setIsUploading(false);
    toast.success("Upload batch finished");
    setUploadQueue((current) => current.filter((item) => item.status !== "success"));
    await loadDocuments();
  };

  const openDocument = async (document: StandaloneDocument) => {
    const { data, error } = await supabase.storage.from("school_pdfs").createSignedUrl(document.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Could not open document");
      return;
    }
    setViewer({
      url: data.signedUrl,
      title: document.title,
      size: document.file_size,
      id: document.id,
      filePath: document.file_path,
      thumbnailPath: document.thumbnail_path,
    });
  };

  const downloadDocument = async (document: StandaloneDocument) => {
    setDownloadingId(document.id);
    try {
      const { data, error } = await supabase.storage.from("school_pdfs").createSignedUrl(document.file_path, 3600);
      if (error || !data?.signedUrl) throw new Error("Could not prepare download");
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = document.title.toLowerCase().endsWith(".pdf") ? document.title : `${document.title}.pdf`;
      const a = window.document.createElement("a");
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const doc = pendingDelete;
    setDeletingId(doc.id);
    try {
      await supabase.storage.from("school_pdfs").remove([doc.file_path]).catch(() => null);
      if (doc.thumbnail_path) {
        await supabase.storage.from("pdf-thumbnails").remove([doc.thumbnail_path]).catch(() => null);
      }

      const { error } = await supabase.from("standalone_documents" as any).delete().eq("id", doc.id);
      if (error) throw error;
      setDocuments((current) => current.filter((d) => d.id !== doc.id));
      if (viewer?.id === doc.id) setViewer(null);
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };


  if (!activeSection) {
    navigate(deptSlug ? `/afit-pdfs/dept/${deptSlug}` : "/afit-pdfs", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/afit-pdfs/dept/${deptSlug}`)} className="rounded-full h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[220px] md:max-w-none">{pageTitle}</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[220px] md:max-w-none">
                {currentDept?.name || "Loading…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isAdmin && !deptLoading && currentDept && (
          <section className="mb-6 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Admin upload to {pageTitle}</h2>
                <p className="text-xs text-muted-foreground">Books and journals are stored separately for this stand-alone department.</p>
              </div>
              <Button onClick={uploadAll} disabled={isUploading || uploadQueue.length === 0} size="sm">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload batch
              </Button>
            </div>

            <div
              className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
            >
              <Input
                id="standalone-documents-upload"
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                disabled={isUploading}
                onChange={(event) => addFiles(Array.from(event.target.files || []))}
              />
              <label htmlFor="standalone-documents-upload" className="cursor-pointer text-sm font-medium">
                Drag & drop PDFs here or click to browse files
              </label>
            </div>

            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadQueue.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/50 bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{item.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{Math.round(item.progress)}% · {item.status}</span>
                    </div>
                    <Progress value={item.progress} className="h-1.5" />
                    {item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted/30" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="font-semibold">No {pageTitle.toLowerCase()} yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Admin-uploaded PDFs will appear here as thumbnail cards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {documents.map((document, index) => {
              const thumbnailUrl = document.thumbnail_url;
              return (
                <motion.article
                  key={document.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <button onClick={() => openDocument(document)} className="block w-full text-left">
                    <div className="aspect-[4/5] bg-muted/30">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={`${document.title} preview`} loading="lazy" className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FileText className="h-14 w-14 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{document.title}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(document.created_at), "MMM d, yyyy")} · {formatSize(document.file_size)}
                      </p>
                    </div>
                  </button>
                  <div className="border-t border-border/40 p-3 flex items-center gap-2">
                    <Button className="flex-1" size="sm" variant="default" onClick={() => openDocument(document)}>
                      <Eye className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      className="flex-1"
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadDocument(document)}
                      disabled={downloadingId === document.id}
                    >
                      {downloadingId === document.id ? (
                        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                      ) : (
                        <Download className="h-4 w-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        onClick={() => setPendingDelete(document)}
                        disabled={deletingId === document.id}
                        aria-label="Delete document"
                      >
                        {deletingId === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      <PDFViewer
        isOpen={!!viewer}
        onClose={() => setViewer(null)}
        pdfUrl={viewer?.url || ""}
        fileName={viewer?.title || ""}
        fileSize={viewer?.size}
        fileId={viewer?.id}
        canDelete={isAdmin && !!viewer}
        isDeleting={!!viewer && deletingId === viewer.id}
        onDelete={() => {
          if (!viewer) return;
          const doc = documents.find((d) => d.id === viewer.id);
          if (doc) setPendingDelete(doc);
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SmartBottomNav />
    </div>
  );
}
