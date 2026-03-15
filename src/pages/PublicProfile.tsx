import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Eye, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { format } from "date-fns";

interface PublicUserData {
  display_name: string | null;
  avatar_url: string | null;
  department_name: string | null;
}

interface ContributedNote {
  id: string;
  title: string;
  created_at: string;
  views: number | null;
  course_code: string;
  course_name: string;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function PublicProfile() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [userData, setUserData] = useState<PublicUserData | null>(null);
  const [notes, setNotes] = useState<ContributedNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // Fetch basic public profile info (display_name, avatar only — no email/private data)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, department_id")
        .eq("id", userId)
        .maybeSingle();

      let departmentName: string | null = null;
      if (profileData?.department_id) {
        const { data: deptData } = await supabase
          .from("departments")
          .select("name")
          .eq("id", profileData.department_id)
          .maybeSingle();
        departmentName = deptData?.name ?? null;
      }

      setUserData({
        display_name: profileData?.display_name ?? "Contributor",
        avatar_url: profileData?.avatar_url ?? null,
        department_name: departmentName,
      });

      // Fetch approved lecture notes they uploaded
      const { data: notesData } = await supabase
        .from("lecture_notes")
        .select(`id, title, created_at, views, courses (code, name)`)
        .eq("uploaded_by", userId)
        .order("created_at", { ascending: false });

      setNotes(
        (notesData || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          created_at: n.created_at,
          views: n.views ?? 0,
          course_code: n.courses?.code ?? "",
          course_name: n.courses?.name ?? "",
        }))
      );
    } catch (err) {
      console.error("Error fetching public profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const displayName = userData?.display_name || "Contributor";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-10 border-b border-border/30 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-semibold">Contributor Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12 animate-pulse">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="h-5 bg-muted rounded w-40" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex flex-col items-center text-center gap-3 pt-4">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg [&>img]:object-cover [&>img]:object-center">
                <AvatarImage src={userData?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{displayName}</h2>
                {userData?.department_name && (
                  <Badge variant="secondary" className="mt-1 gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {userData.department_name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {notes.length} material{notes.length !== 1 ? "s" : ""} contributed
              </p>
            </div>

            {/* Contributions */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Contributions
              </h3>
              {notes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No materials uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{note.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {note.course_code && (
                            <span className="font-medium text-primary/70">{note.course_code}</span>
                          )}
                          <span>{format(new Date(note.created_at), "MMM d, yyyy")}</span>
                          {note.views != null && note.views > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {note.views}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <SmartBottomNav />
    </div>
  );
}
