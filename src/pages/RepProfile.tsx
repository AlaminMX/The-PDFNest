import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRepStatus } from "@/hooks/useRepStatus";
import { useCommunityUploads, CommunityUpload } from "@/hooks/useCommunityUploads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Calendar, Award, Edit2, Inbox, CheckCircle, XCircle, Eye, Loader2, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { EditProfileModal } from "@/components/EditProfileModal";
import { CreateCourseModal } from "@/components/CreateCourseModal";
import { format } from "date-fns";
import { toast } from "sonner";

interface RepProfile {
  displayName: string;
  departmentName: string;
  isInsider: boolean;
  avatarUrl: string | null;
}

interface LectureNote {
  id: string;
  title: string;
  created_at: string;
  views: number;
  course_code: string;
  course_name: string;
}

import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";

export default function RepProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<RepProfile | null>(null);
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  
  const isOwnProfile = user?.id === userId;
  const { departmentId: repDeptId, departmentName: repDeptName } = useRepStatus();

  // Moderation state — only used when isOwnProfile is true
  const [reviewTarget, setReviewTarget] = useState<CommunityUpload | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const {
    uploads: pendingUploads,
    loading: uploadsLoading,
    approveUpload,
    rejectUpload,
  } = useCommunityUploads({
    scope: "rep",
    departmentId: isOwnProfile ? repDeptId : null,
    statusFilter: "pending",
  });

  useEffect(() => {
    if (userId) {
      fetchRepProfile();
    }
  }, [userId]);

  const handleReview = (upload: CommunityUpload, action: "approve" | "reject") => {
    setReviewTarget(upload);
    setReviewAction(action);
    setReviewNote("");
  };

  const handleConfirmReview = async () => {
    if (!reviewTarget || !reviewAction) return;
    setReviewLoading(true);
    try {
      if (reviewAction === "approve") {
        await approveUpload(reviewTarget.id, reviewNote);
        toast.success("Upload approved and added to lecture notes!");
      } else {
        await rejectUpload(reviewTarget.id, reviewNote);
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

  const fetchRepProfile = async () => {
    try {
      setLoading(true);

      // Fetch profile from public_rep_profiles view (safe, limited fields only)
      const { data: profileData } = await supabase
        .from("public_rep_profiles")
        .select(`
          display_name,
          is_insider,
          avatar_url,
          department_id
        `)
        .eq("id", userId)
        .single();

      if (profileData) {
        // Fetch department name separately
        let departmentName = "Unknown Department";
        if (profileData.department_id) {
          const { data: deptData } = await supabase
            .from("departments")
            .select("name")
            .eq("id", profileData.department_id)
            .single();
          if (deptData) {
            departmentName = deptData.name;
          }
        }
        
        setProfile({
          displayName: profileData.display_name || "Course Rep",
          departmentName,
          isInsider: profileData.is_insider || false,
          avatarUrl: profileData.avatar_url,
        });
      }

      // Fetch lecture notes with course info
      const { data: notesData } = await supabase
        .from("lecture_notes")
        .select(`
          id,
          title,
          created_at,
          views,
          courses (
            code,
            name
          )
        `)
        .eq("uploaded_by", userId)
        .order("created_at", { ascending: false });

      if (notesData) {
        setNotes(notesData.map(note => ({
          id: note.id,
          title: note.title,
          created_at: note.created_at!,
          views: note.views || 0,
          course_code: (note.courses as any)?.code || "",
          course_name: (note.courses as any)?.name || "",
        })));
      }
    } catch (err) {
      console.error("Error fetching rep profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <LoadingState message="Loading profile..." />
        <SmartBottomNav />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Profile not found</p>
            <Button onClick={() => navigate("/afit-pdfs")}>
              Back to AFIT PDFs
            </Button>
          </div>
        </div>
        <SmartBottomNav />
      </>
    );
  }

  const totalViews = notes.reduce((sum, note) => sum + note.views, 0);
  const lastUpload = notes.length > 0 ? notes[0].created_at : null;
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <EditProfileModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        userId={userId!}
        currentDisplayName={profile?.displayName || ""}
        currentAvatarUrl={profile?.avatarUrl}
        onUpdateComplete={fetchRepProfile}
      />

      {isOwnProfile && (
        <CreateCourseModal
          open={showCreateCourseModal}
          onClose={() => setShowCreateCourseModal(false)}
          mode="rep"
          departmentId={repDeptId}
          departmentName={repDeptName}
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-24 md:pb-0">
        <PageHeader
          title={profile.displayName}
          subtitle="Course Representative"
          showBack
        backTo="/dashboard"
        />

        <main className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                <Avatar className="w-24 h-24 md:w-32 md:h-32">
                  <AvatarImage src={profile.avatarUrl || undefined} />
                  <AvatarFallback className="text-3xl md:text-4xl">
                    {getInitials(profile.displayName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                      <CardTitle className="text-xl md:text-2xl break-words">
                        {profile.displayName}
                      </CardTitle>
                      {profile.isInsider && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <Award className="w-3 h-3 mr-1" />
                          Insider
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base">
                      {profile.departmentName} • U25
                    </CardDescription>
                  </div>
                  
                  {isOwnProfile && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditModal(true)}
                        className="w-full sm:w-auto"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateCourseModal(true)}
                        className="w-full sm:w-auto"
                        disabled={!repDeptId}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Course
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{notes.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Uploads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalViews}</div>
                <div className="text-sm text-muted-foreground mt-1">Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary truncate">
                  {lastUpload ? format(new Date(lastUpload), "MMM d") : "N/A"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Last Upload</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Uploaded Materials</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {notes.length} lecture {notes.length === 1 ? 'note' : 'notes'} shared
            </p>
          </div>

          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No lecture notes uploaded yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold break-words">{note.title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{note.course_code}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{format(new Date(note.created_at), "MMM dd, yyyy")}</span>
                        </div>
                        {note.views > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {note.views} {note.views === 1 ? 'view' : 'views'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Moderation section (only shown on rep's own profile) ── */}
        {isOwnProfile && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Pending Uploads
                {pendingUploads.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingUploads.length}</Badge>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Community materials in your department awaiting review
              </p>
            </div>

            {uploadsLoading ? (
              <Card>
                <CardContent className="py-8 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : pendingUploads.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No pending uploads</p>
                  <p className="text-xs mt-1">All caught up!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingUploads.map((upload) => (
                  <Card key={upload.id}>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      {/* Title + uploader */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight">{upload.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {upload.uploader_name}
                            {upload.course_code ? ` · ${upload.course_code}` : ""}
                            {" · "}{upload.material_type.replace("_", " ")}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Pending
                        </Badge>
                      </div>

                      {/* File meta */}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="truncate max-w-[200px]">{upload.original_file_name}</span>
                        <span>{(upload.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        {upload.created_at && (
                          <span>{format(new Date(upload.created_at), "MMM d, yyyy")}</span>
                        )}
                      </div>

                      {upload.description && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 line-clamp-2">
                          {upload.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <PreviewFileButton filePath={upload.file_path} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600 border-green-500/30 hover:bg-green-500/10 hover:text-green-700"
                          onClick={() => handleReview(upload, "approve")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleReview(upload, "reject")}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Review dialog ── */}
        {reviewTarget && reviewAction && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) { setReviewTarget(null); setReviewAction(null); }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle
                  className={`flex items-center gap-2 ${
                    reviewAction === "approve" ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {reviewAction === "approve"
                    ? <><CheckCircle className="w-5 h-5" /> Approve Upload</>
                    : <><XCircle className="w-5 h-5" /> Reject Upload</>
                  }
                </DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">{reviewTarget.title}</span>
                  {" "}<span className="text-muted-foreground">by {reviewTarget.uploader_name}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="rep-review-note">
                  {reviewAction === "reject" ? "Reason (recommended)" : "Note (optional)"}
                </Label>
                <Textarea
                  id="rep-review-note"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder={
                    reviewAction === "reject"
                      ? "e.g. Duplicate file, wrong course, low quality..."
                      : "e.g. Great material, thanks for contributing!"
                  }
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setReviewTarget(null); setReviewAction(null); }}
                  disabled={reviewLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReview}
                  disabled={reviewLoading}
                  variant={reviewAction === "approve" ? "default" : "destructive"}
                >
                  {reviewLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {reviewAction === "approve" ? "Approve" : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <SmartBottomNav />
      </main>
    </div>
    </>
  );
}

// ── Helper: preview a file from storage ──
function PreviewFileButton({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.storage
        .from("school_pdfs")
        .createSignedUrl(filePath, 300);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast.error("Could not generate preview link");
      }
    } catch {
      toast.error("Preview failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePreview} disabled={loading} title="Preview file">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
    </Button>
  );
}
