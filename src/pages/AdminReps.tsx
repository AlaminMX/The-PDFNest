import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Users, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

interface RepProfile {
  id: string;
  display_name: string | null;
  department_id: string | null;
  departments: {
    name: string;
  } | null;
  lecture_notes_count: number;
  last_upload: string | null;
}

export default function AdminReps() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [reps, setReps] = useState<RepProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchReps();
    }
  }, [isAdmin]);

  const fetchReps = async () => {
    try {
      setLoading(true);

      // Fetch all users with rep role
      const { data: repRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rep");

      if (rolesError) throw rolesError;

      if (!repRoles || repRoles.length === 0) {
        setReps([]);
        setLoading(false);
        return;
      }

      const repUserIds = repRoles.map((r) => r.user_id);

      // Fetch profiles for these reps
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          display_name,
          department_id,
          departments (
            name
          )
        `)
        .in("id", repUserIds);

      if (profilesError) throw profilesError;

      // Fetch lecture notes count for each rep
      const repsWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count, error: countError } = await supabase
            .from("lecture_notes")
            .select("*", { count: "exact", head: true })
            .eq("uploaded_by", profile.id);

          const { data: lastNote, error: lastError } = await supabase
            .from("lecture_notes")
            .select("created_at")
            .eq("uploaded_by", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...profile,
            lecture_notes_count: count || 0,
            last_upload: lastNote?.created_at || null,
          };
        })
      );

      setReps(repsWithStats);
    } catch (error) {
      console.error("Error fetching reps:", error);
      toast.error("Failed to fetch course reps");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (authLoading || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Course Reps Profile</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">All Course Representatives</h2>
          <p className="text-muted-foreground">
            Click on any rep to view their full profile and uploads
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : reps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No course reps found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reps.map((rep) => (
              <Card
                key={rep.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/rep/${rep.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {rep.display_name || "Unnamed Rep"}
                  </CardTitle>
                  <CardDescription>
                    {rep.departments?.name || "No Department Assigned"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {rep.lecture_notes_count} {rep.lecture_notes_count === 1 ? "upload" : "uploads"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Last upload: {formatDate(rep.last_upload)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            Made with love ❤️ by Nexel
          </p>
        </div>
      </footer>
    </div>
  );
}
