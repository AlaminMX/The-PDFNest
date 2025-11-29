import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRepStatus } from "@/hooks/useRepStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DisplayNameModal } from "@/components/DisplayNameModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Upload, FileText, Eye, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function RepDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isRep, loading: repLoading } = useRepStatus();
  
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalUploads: 0, totalViews: 0 });
  const [recentNotes, setRecentNotes] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading || repLoading) return;
    
    if (!user || !isRep) {
      navigate("/");
      return;
    }

    loadProfile();
  }, [user, isRep, authLoading, repLoading, navigate]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("display_name, department_id, is_insider, departments(name)")
        .eq("id", user!.id)
        .single();

      if (error) throw error;

      setProfile(profileData);

      // Check if display name is set
      if (!profileData.display_name) {
        setShowDisplayNameModal(true);
        return;
      }

      // Load stats
      loadStats();
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-rep-stats", {
        body: { userId: user!.id },
      });

      if (error) throw error;

      setStats(data.stats);
      setRecentNotes(data.recentNotes.slice(0, 5));
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <DisplayNameModal
        open={showDisplayNameModal}
        onComplete={() => {
          setShowDisplayNameModal(false);
          loadProfile();
        }}
      />

      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Course Rep Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {profile?.display_name || "Rep"}!
            </p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.is_insider && (
              <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                🌟 Insider
              </Badge>
            )}
            <ThemeToggle />
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to PDFs
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Total Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUploads}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalViews}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {profile?.departments?.name || "Not Assigned"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Upload CTA */}
        <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Upload Lecture Notes</h3>
                <p className="text-sm text-muted-foreground">
                  Share your notes with fellow students
                </p>
              </div>
              <Button onClick={() => navigate("/rep/upload")} size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Upload Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Your latest lecture notes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No uploads yet. Start by uploading your first lecture note!
              </p>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{note.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {note.courses?.code} • {note.views} views
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nexel Attribution */}
        <p className="text-xs text-center text-muted-foreground/60 mt-8">
          Made with love ❤️ by Nexel
        </p>
      </div>
    </div>
  );
}
