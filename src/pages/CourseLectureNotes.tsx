import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { useCourses } from "@/hooks/useCourses";
import { useLectureNotes } from "@/hooks/useLectureNotes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Download, Eye, Calendar, User, Share2, Trash2 } from "lucide-react";
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
export default function CourseLectureNotes() {
  const navigate = useNavigate();
  const { deptSlug, courseCode } = useParams<{ deptSlug: string; courseCode: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  const { user } = useAuth();
  
  const currentDept = departments.find(d => d.slug === deptSlug);
  const { courses, loading: coursesLoading } = useCourses(currentDept?.id);
  const currentCourse = courses.find(c => c.code === courseCode);
  const { notes, loading: notesLoading, incrementViews, getSignedUrl, deleteNote } = useLectureNotes(currentCourse?.id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title: string; filePath: string; fileSize: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{note.title}</CardTitle>
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
                  <Badge variant="outline">
                    {(note.file_size / (1024 * 1024)).toFixed(1)} MB
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
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
                  {user?.id === note.uploaded_by && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(note)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
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
    </div>
  );
}
