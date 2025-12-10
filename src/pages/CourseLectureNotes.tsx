import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { useCourses } from "@/hooks/useCourses";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Eye, Calendar, Share2, Trash2, Edit2, Sparkles, MoreVertical } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { format } from "date-fns";
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

export default function CourseLectureNotes() {
  const navigate = useNavigate();
  const { deptSlug, courseCode } = useParams<{ deptSlug: string; courseCode: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  const { user } = useAuth();
  
  const currentDept = departments.find(d => d.slug === deptSlug);
  const { courses, loading: coursesLoading } = useCourses(currentDept?.id);
  const currentCourse = courses.find(c => c.code === courseCode);
  const { notes, loading: notesLoading, incrementViews, getSignedUrl, deleteNote, renameNote } = useLectureNotes(currentCourse?.id);

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
    try {
      const url = await getSignedUrl(filePath);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started");
      } else {
        toast.error("Failed to download PDF");
      }
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  const handleShare = (noteId: string, title: string) => {
    const url = `${window.location.origin}/afit-pdfs/${deptSlug}/${courseCode}?note=${noteId}`;
    
    if (navigator.share) {
      navigator.share({
        title: title,
        url: url,
      }).catch(() => {});
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lecture notes...</p>
        </div>
      </div>
    );
  }

  if (!currentDept || !currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Course not found</p>
          <Button onClick={() => navigate("/afit-pdfs")}>
            Back to Departments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/afit-pdfs/${deptSlug}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentCourse.code}</h1>
              <p className="text-sm text-muted-foreground">{currentCourse.name}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Lecture Notes</h2>
            <p className="text-sm text-muted-foreground">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} available
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2 truncate">{note.title}</CardTitle>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <button
                        onClick={() => navigate(`/rep/${note.uploaded_by}`)}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={(note as any).uploader_avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {note.uploaded_by_display
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hover:underline">{note.uploaded_by_display}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(note.created_at!), "MMM dd, yyyy")}
                      </div>
                      {note.views !== null && note.views > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {note.views} {note.views === 1 ? 'view' : 'views'}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {(note.file_size / (1024 * 1024)).toFixed(1)} MB
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Desktop actions */}
                <div className="hidden md:flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleView(note.id, note.file_path, note.title)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(note.file_path, note.title)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(note.id, note.title)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  
                  {/* AI Features Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Features
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleAIAction('summary', { id: note.id, title: note.title, filePath: note.file_path })}>
                        📄 Summarize
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIAction('study-guide', { id: note.id, title: note.title, filePath: note.file_path })}>
                        📚 Study Guide
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIAction('voice', { id: note.id, title: note.title, filePath: note.file_path })}>
                        🔊 Voice Reader
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIAction('translate', { id: note.id, title: note.title, filePath: note.file_path })}>
                        🌐 Translate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIAction('chat', { id: note.id, title: note.title, filePath: note.file_path })}>
                        💬 Chat with PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {user?.id === note.uploaded_by && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRenameClick({ id: note.id, title: note.title })}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(note)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>

                {/* Mobile actions */}
                <div className="flex md:hidden gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(note.id, note.file_path, note.title)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(note.file_path, note.title)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
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
                            📄 Summarize
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAIAction('study-guide', { id: note.id, title: note.title, filePath: note.file_path })}>
                            📚 Study Guide
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAIAction('voice', { id: note.id, title: note.title, filePath: note.file_path })}>
                            🔊 Voice Reader
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAIAction('translate', { id: note.id, title: note.title, filePath: note.file_path })}>
                            🌐 Translate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAIAction('chat', { id: note.id, title: note.title, filePath: note.file_path })}>
                            💬 Chat with PDF
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
              </CardContent>
            </Card>
          ))}
        </div>

        {notes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No lecture notes available for this course yet</p>
          </div>
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
    </div>
  );
}