import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useDepartments } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, FileText, Calendar, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

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
  const { departments } = useDepartments();
  const [reps, setReps] = useState<RepProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create rep form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRepEmail, setNewRepEmail] = useState("");
  const [newRepPassword, setNewRepPassword] = useState("");
  const [newRepDisplayName, setNewRepDisplayName] = useState("");
  const [newRepDepartmentId, setNewRepDepartmentId] = useState("");

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

      // Ensure we have a valid session before querying
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found");
        toast.error("Please log in again");
        setLoading(false);
        return;
      }

      // Fetch all users with rep role
      const { data: repRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rep");

      if (rolesError) {
        console.error("Error fetching rep roles:", rolesError);
        throw rolesError;
      }

      console.log("Found rep roles:", repRoles);

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

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      console.log("Found profiles:", profiles);

      // Fetch lecture notes count for each rep
      const repsWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from("lecture_notes")
            .select("*", { count: "exact", head: true })
            .eq("uploaded_by", profile.id);

          const { data: lastNote } = await supabase
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

  const handleCreateRep = async () => {
    if (!newRepEmail || !newRepPassword || !newRepDisplayName || !newRepDepartmentId) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newRepPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke("create-rep-account", {
        body: {
          email: newRepEmail,
          password: newRepPassword,
          displayName: newRepDisplayName,
          departmentId: newRepDepartmentId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create rep account");
      }

      toast.success("Rep account created successfully");
      setShowCreateDialog(false);
      setNewRepEmail("");
      setNewRepPassword("");
      setNewRepDisplayName("");
      setNewRepDepartmentId("");
      fetchReps();
    } catch (error: any) {
      console.error("Error creating rep:", error);
      toast.error(error.message || "Failed to create rep account");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRep = async (repId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete rep "${displayName}"? This will remove their account and all uploaded content.`)) {
      return;
    }

    try {
      // Delete all lecture notes by this rep
      const { data: notes, error: notesQueryError } = await supabase
        .from("lecture_notes")
        .select("id, file_path")
        .eq("uploaded_by", repId);

      if (notesQueryError) throw notesQueryError;

      // Delete files from storage
      if (notes && notes.length > 0) {
        const filePaths = notes.map(n => n.file_path);
        await supabase.storage.from("school_pdfs").remove(filePaths);

        // Delete lecture notes records
        const { error: deleteNotesError } = await supabase
          .from("lecture_notes")
          .delete()
          .eq("uploaded_by", repId);

        if (deleteNotesError) throw deleteNotesError;
      }

      // Delete rep role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", repId)
        .eq("role", "rep");

      if (roleError) throw roleError;

      toast.success("Rep account deleted successfully");
      fetchReps();
    } catch (error) {
      console.error("Error deleting rep:", error);
      toast.error("Failed to delete rep account");
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
    return <LoadingState message="Verifying access..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Course Reps Management"
        subtitle="View and manage all course representatives"
        showBack
        icon={<Users className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Create Rep Button */}
        <div className="flex justify-end">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Rep Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Rep Account</DialogTitle>
                <DialogDescription>
                  Create a new course representative account with login credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="rep@example.com"
                    value={newRepEmail}
                    onChange={(e) => setNewRepEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newRepPassword}
                    onChange={(e) => setNewRepPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Rep display name"
                    value={newRepDisplayName}
                    onChange={(e) => setNewRepDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={newRepDepartmentId} onValueChange={setNewRepDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRep} disabled={creating}>
                  {creating ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <LoadingSpinner className="py-12" />
        ) : reps.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="No course reps found"
            description="There are no course representatives in the system yet. Create one to get started."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {reps.map((rep) => (
              <Card key={rep.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="truncate">{rep.display_name || "Unnamed Rep"}</span>
                  </CardTitle>
                  <CardDescription className="truncate">
                    {rep.departments?.name || "No Department Assigned"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {rep.lecture_notes_count} {rep.lecture_notes_count === 1 ? "upload" : "uploads"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground truncate">
                        Last: {formatDate(rep.last_upload)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => navigate(`/rep/${rep.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      View Profile
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleDeleteRep(rep.id, rep.display_name || "Unnamed")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            Made with love ❤️ by Nexel
          </p>
        </div>
      </footer>
    </div>
  );
}
