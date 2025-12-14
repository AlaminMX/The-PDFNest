import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { useCourses } from "@/hooks/useCourses";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Eye, Calendar, Share2, Trash2, Edit2, Sparkles, MoreVertical, FileText, BookOpen, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNav } from "@/components/BottomNav";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDFSummaryModal } from "@/components/PDFSummaryModal";
import { StudyGuideModal } from "@/components/StudyGuideModal";
import { PDFAudioPlayer } from "@/components/PDFAudioPlayer";
import { TranslatorModal } from "@/components/TranslatorModal";
import { PDFChatInterface } from "@/components/PDFChatInterface";

function CourseLectureNotesContent() {
  const navigate = useNavigate();
  const { deptSlug, courseCode } = useParams<{ deptSlug: string; courseCode: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  const { user } = useAuth();
  const { session, user: sessionUser } = useSession();
  
  const currentDept = departments.find(d => d.slug === deptSlug);
  const { courses, loading: coursesLoading } = useCourses(currentDept?.id);
  const currentCourse = courses.find(c => c.code === courseCode);
  const { notes, loading: notesLoading, incrementViews, getSignedUrl, deleteNote, renameNote } = useLectureNotes(currentCourse?.id);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title: string; filePath: string; fileSize: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [noteToRename, setNoteToRename] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState(false);

  // AI feature modal states
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [studyGuideModalOpen, setStudyGuideModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [translatorModalOpen, setTranslatorModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<{ id: string; title: string; filePath: string } | null>(null);

  const loading = deptLoading || coursesLoading || notesLoading;

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    
    const query = searchQuery.toLowerCase().trim();
    return notes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(query);
      const uploaderMatch = (
        note.uploaded_by_display.toLowerCase().includes(query) ||
        ((note as any).uploader_display_name || "").toLowerCase().includes(query)
      );
      return titleMatch || uploaderMatch;
    });
  }, [notes, searchQuery]);

  const handleView = async (noteId: string, filePath: string, title: string) => {
    try {
      await incrementViews(noteId);
      const url = await getSignedUrl(filePath);
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Failed to load PDF");
      }
    } catch (err) {
      toast.error("Failed to open PDF");
    }
  };

  const handleDownload = async (filePath: string, title: string) => {
    const toastId = toast.loading("Preparing download...");
    try {
      const url = await getSignedUrl(filePath);
      if (url) {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(blobUrl);
        toast.dismiss(toastId);
        toast.success("Download started");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to download PDF");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to download PDF");
    }
  };

  const handleShare = (noteId: string, title: string) => {
    const url = `${window.location.origin}/afit-pdfs/${deptSlug}/${courseCode}?note=${noteId}`;
    
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleDeleteClick = (note: { id: string; title: string; file_path: string; file_size: number }) => {
    setNoteToDelete({
      id: note.id,
      title: note.title,
      filePath: note.file_path,
      fileSize: note.file_size,
    });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    
    setDeleting(true);
    const success = await deleteNote(noteToDelete.id, noteToDelete.filePath, noteToDelete.fileSize);
    setDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const handleRenameClick = (note: { id: string; title: string }) => {
    setNoteToRename(note);
    setNewTitle(note.title);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!noteToRename || !newTitle.trim()) return;
    
    setRenaming(true);
    const success = await renameNote(noteToRename.id, newTitle.trim());
    setRenaming(false);
    
    if (success) {
      setRenameDialogOpen(false);
      setNoteToRename(null);
      setNewTitle("");
    }
  };

  const handleAIAction = (action: string, note: { id: string; title: string; filePath: string }) => {
    setSelectedNote(note);
    switch (action) {
      case 'summary':
        setSummaryModalOpen(true);
        break;
      case 'study-guide':
        setStudyGuideModalOpen(true);
        break;
      case 'voice':
        setVoiceModalOpen(true);
        break;
      case 'translate':
        setTranslatorModalOpen(true);
        break;
      case 'chat':
        setChatModalOpen(true);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading lecture notes...</p>
        </motion.div>
      </div>
    );
  }

  if (!currentDept || !currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-4"
        >
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Course not found</p>
          <Button onClick={() => navigate("/afit-pdfs")} variant="outline" size="sm">
            Back to Departments
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/afit-pdfs/${deptSlug}`)}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-primary">{currentCourse.code}</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[160px] md:max-w-none">
                {currentCourse.name}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        {/* Stats & Search */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{notes.length}</span>{" "}
              {notes.length === 1 ? 'lecture note' : 'lecture notes'}
            </p>
            <Badge variant="outline" className="text-xs font-normal">
              {currentDept.name}
            </Badge>
          </div>
          
          {/* Search Bar */}
          {notes.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or uploader..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10 bg-muted/30 border-border/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Search Results Info */}
        <AnimatePresence>
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <p className="text-xs text-muted-foreground">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'result' : 'results'} for "{searchQuery}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        <div className="space-y-2">
          {filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              className="p-4 rounded-lg border border-border/50 bg-card/50 transition-colors"
            >
              {/* Note Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1 line-clamp-2">{note.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <button
                      onClick={() => navigate(`/rep/${note.uploaded_by}`)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={(note as any).uploader_avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {((note as any).uploader_display_name || note.uploaded_by_display)
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hover:underline">
                        {(note as any).uploader_display_name || note.uploaded_by_display}
                      </span>
                    </button>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(note.created_at!), "MMM d, yyyy")}
                    </span>
                    {note.views !== null && note.views > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {note.views}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-normal">
                  {(note.file_size / (1024 * 1024)).toFixed(1)} MB
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 md:flex-none h-8 text-xs"
                  onClick={() => handleView(note.id, note.file_path, note.title)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 md:flex-none h-8 text-xs"
                  onClick={() => handleDownload(note.file_path, note.title)}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </Button>
                
                {/* More Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleShare(note.id, note.title)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Features
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleAIAction('summary', { id: note.id, title: note.title, filePath: note.file_path })}>
                          Summarize
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAIAction('study-guide', { id: note.id, title: note.title, filePath: note.file_path })}>
                          Study Guide
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAIAction('voice', { id: note.id, title: note.title, filePath: note.file_path })}>
                          Voice Reader
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAIAction('translate', { id: note.id, title: note.title, filePath: note.file_path })}>
                          Translate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAIAction('chat', { id: note.id, title: note.title, filePath: note.file_path })}>
                          Chat with PDF
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {user?.id === note.uploaded_by && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRenameClick({ id: note.id, title: note.title })}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(note)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredNotes.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No results found</p>
            <p className="text-xs text-muted-foreground">
              Try searching with different keywords
            </p>
          </motion.div>
        )}

        {/* Empty State */}
        {!searchQuery && notes.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No lecture notes yet</p>
            <p className="text-xs text-muted-foreground">
              Course reps can upload notes for this course
            </p>
          </motion.div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lecture Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Lecture Note</DialogTitle>
            <DialogDescription>
              Enter a new title for this lecture note.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-title">New Title</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title..."
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !renaming && newTitle.trim()) {
                  handleConfirmRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename} disabled={renaming || !newTitle.trim()}>
              {renaming ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Feature Modals */}
      {selectedNote && (
        <>
          <PDFSummaryModal
            open={summaryModalOpen}
            onOpenChange={setSummaryModalOpen}
            fileId={selectedNote.id}
            fileName={selectedNote.title}
          />
          <StudyGuideModal
            open={studyGuideModalOpen}
            onOpenChange={setStudyGuideModalOpen}
            fileId={selectedNote.id}
            fileName={selectedNote.title}
          />
          <PDFAudioPlayer
            open={voiceModalOpen}
            onOpenChange={setVoiceModalOpen}
            fileId={selectedNote.id}
            fileName={selectedNote.title}
          />
          <TranslatorModal
            open={translatorModalOpen}
            onOpenChange={setTranslatorModalOpen}
            fileId={selectedNote.id}
            fileName={selectedNote.title}
          />
          <PDFChatInterface
            open={chatModalOpen}
            onOpenChange={setChatModalOpen}
            fileId={selectedNote.id}
            fileName={selectedNote.title}
          />
        </>
      )}

      <BottomNav isLoggedIn={!!session} userId={sessionUser?.id} />
    </div>
  );
}

export default function CourseLectureNotes() {
  return (
    <AuthGate>
      <CourseLectureNotesContent />
    </AuthGate>
  );
}
