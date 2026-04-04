import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePQCourses } from "@/hooks/usePQCourses";
import { usePastQuestions } from "@/hooks/usePastQuestions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Eye, Calendar, FileText, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { PDFViewer } from "@/components/PDFViewer";
import { GuestAuthPrompt } from "@/components/GuestAuthPrompt";
import { useDownloadManager } from "@/hooks/useDownloadManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function PQFiles() {
  const navigate = useNavigate();
  const { level, semester, courseCode } = useParams<{ level: string; semester: string; courseCode: string }>();
  const levelNum = parseInt(level || "100", 10);
  const { courses, loading: coursesLoading } = usePQCourses(levelNum, semester);
  const currentCourse = courses.find(c => c.code === courseCode);
  const { questions, loading: filesLoading, incrementViews, getSignedUrl } = usePastQuestions(currentCourse?.id);
  const { downloadFile } = useDownloadManager();
  const { user } = useAuth();

  const [guestOpen, setGuestOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewerPdfUrl, setViewerPdfUrl] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");

  const loading = coursesLoading || filesLoading;

  const requireAuth = (action: () => void) => {
    if (!user) { setGuestOpen(true); return; }
    action();
  };

  const handleView = async (qId: string, filePath: string, title: string) => {
    try {
      await incrementViews(qId);
      const url = await getSignedUrl(filePath);
      if (url) { setSelectedTitle(title); setViewerPdfUrl(url); setPdfViewerOpen(true); }
      else toast.error("Failed to load PDF");
    } catch { toast.error("Failed to open PDF"); }
  };

  const handleDownload = (filePath: string, title: string) => {
    requireAuth(async () => {
      const url = await getSignedUrl(filePath);
      if (url) await downloadFile(url, `${title}.pdf`);
      else toast.error("Failed to download");
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse" />
            <div className="space-y-1.5"><div className="h-4 w-32 bg-muted/50 rounded animate-pulse" /><div className="h-3 w-20 bg-muted/30 rounded animate-pulse" /></div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/20 animate-pulse">
              <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-muted/50 shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted/50 rounded w-3/4" /><div className="h-3 bg-muted/30 rounded w-1/3" /></div></div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (!currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>
          <p className="text-sm text-muted-foreground mb-4">Course not found</p>
          <Button onClick={() => navigate("/past-questions")} variant="outline" size="sm">Back to Past Questions</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/past-questions/level/${level}/semester/${semester}`)} className="rounded-full h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{currentCourse.code}</h1>
              <p className="text-[13px] text-muted-foreground truncate max-w-[160px] md:max-w-none">{currentCourse.name}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{questions.length}</span> past {questions.length === 1 ? "question" : "questions"}
          </p>
        </motion.div>

        {questions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3"><FileText className="w-5 h-5 text-muted-foreground" /></div>
            <p className="text-sm text-muted-foreground">No past questions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Be the first to contribute!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-border/40 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleView(q.id, q.file_path, q.title)}>
                        {q.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>{q.uploaded_by_display}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.material_type}</Badge>
                        {q.created_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{format(new Date(q.created_at), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/50">
                        <Eye className="w-3 h-3" /> {q.views} views
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(q.id, q.file_path, q.title)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(q.file_path, q.title)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <GuestAuthPrompt open={guestOpen} action="download past questions" onClose={() => setGuestOpen(false)} />
      {pdfViewerOpen && viewerPdfUrl && (
        <PDFViewer pdfUrl={viewerPdfUrl} title={selectedTitle} onClose={() => { setPdfViewerOpen(false); setViewerPdfUrl(""); }} />
      )}
      <SmartBottomNav />
    </div>
  );
}
