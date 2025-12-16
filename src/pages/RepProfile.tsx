import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, FileText, Calendar, Award, Edit2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { EditProfileModal } from "@/components/EditProfileModal";
import { format } from "date-fns";

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
  
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchRepProfile();
    }
  }, [userId]);

  const fetchRepProfile = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select(`
          display_name,
          is_insider,
          avatar_url,
          departments (
            name
          )
        `)
        .eq("id", userId)
        .single();

      if (profileData) {
        setProfile({
          displayName: profileData.display_name || "Course Rep",
          departmentName: (profileData.departments as any)?.name || "Unknown Department",
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
      
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-24 md:pb-0">
        <PageHeader
          title={profile.displayName}
          subtitle="Course Representative"
          showBack
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
                      {profile.departmentName} • 100L
                    </CardDescription>
                  </div>
                  
                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                      className="w-full md:w-auto"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
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
        
        <SmartBottomNav />
      </main>
    </div>
    </>
  );
}
