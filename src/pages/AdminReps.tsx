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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Course {
  id?: string;
  code: string;
  name: string;
  semester?: string;
  isNew?: boolean;
  isDeleted?: boolean;
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
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentColor, setNewDepartmentColor] = useState("");
  const [newDepartmentIcon, setNewDepartmentIcon] = useState("");
  const [courses, setCourses] = useState<{ code: string; name: string }[]>([{ code: "", name: "" }]);
  const [selectedCreateSemester, setSelectedCreateSemester] = useState<string>("first");

  // Edit rep state - FULL editing capability
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRep, setEditingRep] = useState<RepProfile | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editCourses, setEditCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editSemester, setEditSemester] = useState<string>("first");

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
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

      if (rolesError) throw rolesError;

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

      if (profilesError) throw profilesError;

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

  const fetchCoursesForDepartment = async (departmentId: string, semester: string) => {
    if (!departmentId) {
      setEditCourses([]);
      return;
    }
    
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, semester")
        .eq("department_id", departmentId)
        .eq("semester", semester)
        .order("name");

      if (error) throw error;
      setEditCourses(data?.map(c => ({ id: c.id, code: c.code, name: c.name, semester: c.semester })) || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoadingCourses(false);
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

  // Edit dialog course management
  const addEditCourse = () => {
    setEditCourses([...editCourses, { code: "", name: "", semester: editSemester, isNew: true }]);
  };

  const removeEditCourse = (index: number) => {
    const course = editCourses[index];
    if (course.id) {
      const updated = [...editCourses];
      updated[index] = { ...course, isDeleted: true };
      setEditCourses(updated);
    } else {
      setEditCourses(editCourses.filter((_, i) => i !== index));
    }
  };

  const updateEditCourse = (index: number, field: "code" | "name", value: string) => {
    const updated = [...editCourses];
    updated[index] = { ...updated[index], [field]: value };
    setEditCourses(updated);
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

    const validCourses = courses.filter(c => c.name.trim());
    if (validCourses.length === 0) {
      toast.error("Please add at least one course");
      return;
    }

    setCreating(true);
    try {
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

      const coursesToInsert = validCourses.map(c => ({
        department_id: departmentId,
        code: c.code.trim() || c.name.trim().substring(0, 10).toUpperCase().replace(/\s/g, ""),
        name: c.name.trim(),
        level: 100,
        semester: selectedCreateSemester,
      }));

      await supabase.from("courses").insert(coursesToInsert);

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

      toast.success("Rep account created successfully");
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
    setSelectedCreateSemester("first");
  };

  const handleDeleteRep = async (repId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete rep "${displayName}"? This will remove their role and all uploaded content.`)) {
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

        await supabase.from("lecture_notes").delete().eq("uploaded_by", repId);
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

  const handleOpenEditDialog = async (rep: RepProfile) => {
    setEditingRep(rep);
    setEditEmail(rep.email || "");
    setEditPassword("");
    setEditDisplayName(rep.display_name || "");
    setEditDepartmentId(rep.department_id || "");
    setEditSemester("first");
    setShowEditDialog(true);
    
    if (rep.department_id) {
      await fetchCoursesForDepartment(rep.department_id, "first");
    } else {
      setEditCourses([]);
    }
  };

  const handleDepartmentChange = async (newDeptId: string) => {
    setEditDepartmentId(newDeptId);
    await fetchCoursesForDepartment(newDeptId, editSemester);
  };

  const handleEditSemesterChange = async (semester: string) => {
    // Save any pending changes for current semester before switching
    setEditSemester(semester);
    if (editDepartmentId) {
      await fetchCoursesForDepartment(editDepartmentId, semester);
    }
  };

  const handleUpdateRep = async () => {
    if (!editingRep) return;
    
    if (!editDisplayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setUpdating(true);
    try {
      // Use edge function for email/password/profile updates
      const response = await supabase.functions.invoke("update-rep-account", {
        body: {
          repId: editingRep.id,
          email: editEmail !== editingRep.email ? editEmail : undefined,
          password: editPassword || undefined,
          displayName: editDisplayName.trim(),
          departmentId: editDepartmentId || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to update rep");
      }

      // Handle course changes for the department
      if (editDepartmentId) {
        // Delete removed courses
        const toDelete = editCourses.filter(c => c.id && c.isDeleted);
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("courses")
            .delete()
            .in("id", toDelete.map(c => c.id!));
          if (deleteError) console.error("Error deleting courses:", deleteError);
        }

        // Update existing courses
        const toUpdate = editCourses.filter(c => c.id && !c.isNew && !c.isDeleted);
        for (const course of toUpdate) {
          await supabase
            .from("courses")
            .update({ code: course.code, name: course.name })
            .eq("id", course.id!);
        }

        // Insert new courses with semester
        const toInsert = editCourses.filter(c => c.isNew && !c.isDeleted && c.name.trim());
        if (toInsert.length > 0) {
          await supabase.from("courses").insert(
            toInsert.map(c => ({
              department_id: editDepartmentId,
              code: c.code.trim() || c.name.trim().substring(0, 10).toUpperCase().replace(/\s/g, ""),
              name: c.name.trim(),
              level: 100,
              semester: c.semester || editSemester,
            }))
          );
        }
      }

      toast.success("Rep updated successfully");
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

  const visibleEditCourses = editCourses.filter(c => !c.isDeleted);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Course Reps Management"
        subtitle="View and manage all course representatives"
        showBack
        backTo="/admin"
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
                 