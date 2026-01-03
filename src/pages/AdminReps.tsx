import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, FileText, Calendar, Plus, Trash2, Eye, X, Sparkles, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

interface RepProfile {
  id: string;
  display_name: string | null;
  email: string | null;
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
  
  // Create rep form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRepEmail, setNewRepEmail] = useState("");
  const [newRepPassword, setNewRepPassword] = useState("");
  const [newRepDisplayName, setNewRepDisplayName] = useState("");
  
  // Dynamic department input (free text)
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentColor, setNewDepartmentColor] = useState("");
  const [newDepartmentIcon, setNewDepartmentIcon] = useState("");
  
  // Dynamic courses list
  const [courses, setCourses] = useState<{ code: string; name: string }[]>([{ code: "", name: "" }]);

  // Edit rep state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRep, setEditingRep] = useState<RepProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [updating, setUpdating] = useState(false);

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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found");
        toast.error("Please log in again");
        setLoading(false);
        return;
      }

      const { data: repRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rep");

      if (rolesError) {
        console.error("Error fetching rep roles:", rolesError);
        throw rolesError;
      }

      if (!repRoles || repRoles.length === 0) {
        setReps([]);
        setLoading(false);
        return;
      }

      const repUserIds = repRoles.map((r) => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          display_name,
          email,
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

  const addCourse = () => {
    setCourses([...courses, { code: "", name: "" }]);
  };

  const removeCourse = (index: number) => {
    if (courses.length > 1) {
      setCourses(courses.filter((_, i) => i !== index));
    }
  };

  const updateCourse = (index: number, field: "code" | "name", value: string) => {
    const updated = [...courses];
    updated[index][field] = value;
    setCourses(updated);
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleCreateRep = async () => {
    if (!newRepEmail || !newRepPassword || !newRepDisplayName || !newDepartmentName.trim()) {
      toast.error("Please fill in email, password, display name, and department");
      return;
    }

    if (newRepPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Validate at least one course with name
    const validCourses = courses.filter(c => c.name.trim());
    if (validCourses.length === 0) {
      toast.error("Please add at least one course");
      return;
    }

    setCreating(true);
    try {
      // Step 1: Check if department exists or create new one
      const deptSlug = generateSlug(newDepartmentName.trim());
      
      let { data: existingDept } = await supabase
        .from("departments")
        .select("id")
        .eq("slug", deptSlug)
        .maybeSingle();

      let departmentId: string;

      if (existingDept) {
        departmentId = existingDept.id;
      } else {
        // Create new department
        const { data: newDept, error: deptError } = await supabase
          .from("departments")
          .insert({
            name: newDepartmentName.trim(),
            slug: deptSlug,
            color: newDepartmentColor.trim() || null,
            icon: newDepartmentIcon.trim() || null,
          })
          .select("id")
          .single();

        if (deptError) throw new Error("Failed to create department: " + deptError.message);
        departmentId = newDept.id;
      }

      // Step 2: Create courses under this department
      const coursesToInsert = validCourses.map(c => ({
        department_id: departmentId,
        code: c.code.trim() || c.name.trim().substring(0, 10).toUpperCase().replace(/\s/g, ""),
        name: c.name.trim(),
        level: 100, // Default level
      }));

      const { error: coursesError } = await supabase
        .from("courses")
        .insert(coursesToInsert);

      if (coursesError) {
        console.error("Error creating courses:", coursesError);
        // Continue anyway - courses might already exist
      }

      // Step 3: Create rep account via edge function
      const response = await supabase.functions.invoke("create-rep-account", {
        body: {
          email: newRepEmail,
          password: newRepPassword,
          displayName: newRepDisplayName,
          departmentId: departmentId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create rep account");
      }

      toast.success("Rep account created successfully with department and courses");
      resetForm();
      fetchReps();
    } catch (error: any) {
      console.error("Error creating rep:", error);
      toast.error(error.message || "Failed to create rep account");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setShowCreateDialog(false);
    setNewRepEmail("");
    setNewRepPassword("");
    setNewRepDisplayName("");
    setNewDepartmentName("");
    setNewDepartmentColor("");
    setNewDepartmentIcon("");
    setCourses([{ code: "", name: "" }]);
  };

  const handleDeleteRep = async (repId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete rep "${displayName}"? This will remove their account and all uploaded content.`)) {
      return;
    }

    try {
      const { data: notes, error: notesQueryError } = await supabase
        .from("lecture_notes")
        .select("id, file_path")
        .eq("uploaded_by", repId);

      if (notesQueryError) throw notesQueryError;

      if (notes && notes.length > 0) {
        const filePaths = notes.map(n => n.file_path);
        await supabase.storage.from("school_pdfs").remove(filePaths);

        const { error: deleteNotesError } = await supabase
          .from("lecture_notes")
          .delete()
          .eq("uploaded_by", repId);

        if (deleteNotesError) throw deleteNotesError;
      }

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

  const handleOpenEditDialog = (rep: RepProfile) => {
    setEditingRep(rep);
    setEditDisplayName(rep.display_name || "");
    setShowEditDialog(true);
  };

  const handleUpdateRep = async () => {
    if (!editingRep) return;
    
    if (!editDisplayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: editDisplayName.trim() })
        .eq("id", editingRep.id);

      if (error) throw error;

      toast.success("Rep profile updated successfully");
      setShowEditDialog(false);
      setEditingRep(null);
      fetchReps();
    } catch (error: any) {
      console.error("Error updating rep:", error);
      toast.error(error.message || "Failed to update rep");
    } finally {
      setUpdating(false);
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
            <DialogContent className="max-w-2xl max-h-[90vh] p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Create New Rep Account
                </DialogTitle>
                <DialogDescription>
                  Create a course representative with a new or existing department and courses.
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh] px-6 py-4">
                <div className="space-y-6">
                  {/* Rep Credentials */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Rep Credentials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        placeholder="e.g., CS Course Rep"
                        value={newRepDisplayName}
                        onChange={(e) => setNewRepDisplayName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Department
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="departmentName">Department Name</Label>
                        <Input
                          id="departmentName"
                          placeholder="e.g., Computer Science"
                          value={newDepartmentName}
                          onChange={(e) => setNewDepartmentName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          If department exists, rep will be linked to it. Otherwise, a new one will be created.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="deptColor">Color (optional)</Label>
                          <Input
                            id="deptColor"
                            placeholder="e.g., emerald, blue"
                            value={newDepartmentColor}
                            onChange={(e) => setNewDepartmentColor(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deptIcon">Icon Emoji (optional)</Label>
                          <Input
                            id="deptIcon"
                            placeholder="e.g., 💻, 🔒"
                            value={newDepartmentIcon}
                            onChange={(e) => setNewDepartmentIcon(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Courses */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Courses Offered
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCourse}
                        className="gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Course
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {courses.map((course, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <Input
                              placeholder="Code (optional)"
                              value={course.code}
                              onChange={(e) => updateCourse(index, "code", e.target.value)}
                              className="col-span-1"
                            />
                            <Input
                              placeholder="Course Name"
                              value={course.name}
                              onChange={(e) => updateCourse(index, "name", e.target.value)}
                              className="col-span-2"
                            />
                          </div>
                          {courses.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCourse(index)}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add all courses this department offers. You can add unlimited courses.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRep} disabled={creating}>
                  {creating ? "Creating..." : "Create Rep & Department"}
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
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleOpenEditDialog(rep)}
                    >
                      <Edit2 className="h-4 w-4" />
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

      {/* Edit Rep Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Edit Rep Profile
            </DialogTitle>
            <DialogDescription>
              Update the course representative's profile information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">Display Name</Label>
              <Input
                id="editDisplayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter display name"
              />
            </div>
            
            {editingRep?.email && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {editingRep.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here for security reasons.
                </p>
              </div>
            )}
            
            {editingRep?.departments?.name && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Department</Label>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {editingRep.departments.name}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRep} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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