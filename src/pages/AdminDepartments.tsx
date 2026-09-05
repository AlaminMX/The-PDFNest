import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useDepartments } from "@/hooks/useDepartments";
import { useDepartmentCategories } from "@/hooks/useDepartmentCategories";
import { useFaculties } from "@/hooks/useFaculties";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Edit, Palette, Sparkles, Plus, Trash2, GripVertical, Eye, EyeOff, Tag, GraduationCap, BookPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { CreateCourseModal } from "@/components/CreateCourseModal";
import { TileImageUpload } from "@/components/TileImageUpload";
import { getDepartmentStyles, getIconGlowStyles } from "@/lib/departmentColors";
import { Reorder, useDragControls } from "framer-motion";

interface EditingDepartment {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_visible: boolean;
  category_id: string | null;
  faculty_id: string | null;
  background_image_url: string | null;
  background_overlay_opacity: number;
}

interface NewDepartment {
  name: string;
  color: string;
  icon: string;
  category_id: string;
  faculty_id: string;
  background_image_url: string;
  background_overlay_opacity: number;
}

interface DepartmentItemProps {
  dept: any;
  index: number;
  onEdit: (dept: any) => void;
  onDelete: (dept: any) => void;
  onToggleVisibility: (dept: any) => void;
  categoryName?: string;
}

function DepartmentItem({ dept, index, onEdit, onDelete, onToggleVisibility, categoryName }: DepartmentItemProps) {
  const navigate = useNavigate();
  const dragControls = useDragControls();
  const styles = getDepartmentStyles(dept.color, index);
  const icon = dept.icon?.trim();
  const iconGlow = icon ? getIconGlowStyles(styles.hsl) : null;

  return (
    <Reorder.Item
      value={dept}
      id={dept.id}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
    >
      <Card 
        className={`overflow-hidden transition-all hover:shadow-lg ${!dept.is_visible ? 'opacity-60' : ''}`}
        style={{ borderColor: `${styles.cssHsl}20` }}
      >
        <div 
          className="p-4"
          style={{ background: styles.bgLight }}
        >
          <div className="flex items-center gap-4">
            {/* Drag Handle */}
            <div
              className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-white/10 transition-colors"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Icon Preview */}
            {icon && iconGlow && (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: styles.accentBg,
                  boxShadow: `0 4px 20px ${styles.glowColor}, 0 0 40px ${styles.glowIntense}`,
                }}
              >
                <span
                  className="text-3xl"
                  style={{
                    filter: iconGlow.filter,
                    textShadow: iconGlow.textShadow,
                  }}
                >
                  {icon}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-white">
                  {dept.name}
                </h3>
                {!dept.is_visible && (
                  <span className="text-xs bg-muted/30 text-muted-foreground px-2 py-0.5 rounded">
                    Hidden
                  </span>
                )}
                {categoryName && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Tag className="w-3 h-3" />
                    {categoryName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  {dept.color || "Auto"}
                </span>
                <span>•</span>
                <span>Icon: {dept.icon?.trim() || "None"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onToggleVisibility(dept)}
                title={dept.is_visible ? "Hide from users" : "Show to users"}
              >
                {dept.is_visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(dept)}
                className="gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/departments/${dept.id}/levels`)}
                className="gap-1.5"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Levels
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDelete(dept)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Reorder.Item>
  );
}

export default function AdminDepartments() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const { departments, loading: deptLoading, refresh: refreshDepartments } = useDepartments();
  const { categories } = useDepartmentCategories();
  const { faculties, refresh: refreshFaculties } = useFaculties();
  
  const [editingDept, setEditingDept] = useState<EditingDepartment | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDept, setNewDept] = useState<NewDepartment>({ name: "", color: "", icon: "", category_id: "", faculty_id: "", background_image_url: "", background_overlay_opacity: 50 });
  const [creating, setCreating] = useState(false);
  const [deletingDept, setDeletingDept] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<{ courses: number; lectureNotes: number; standaloneDocs: number } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [orderedDepts, setOrderedDepts] = useState<any[]>([]);
  const [showQuickCreateCourse, setShowQuickCreateCourse] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  // Sync ordered departments with fetched departments
  useEffect(() => {
    setOrderedDepts(departments);
  }, [departments]);

  // When a department is selected for deletion, look up how many rows in
  // dependent tables would actually be destroyed, so the confirmation
  // dialog can show real numbers instead of a vague "may affect" warning.
  useEffect(() => {
    if (!deletingDept) {
      setDeleteImpact(null);
      return;
    }

    let cancelled = false;
    setLoadingImpact(true);
    setDeleteImpact(null);

    (async () => {
      const [coursesListRes, standaloneDocsRes] = await Promise.all([
        supabase.from("courses").select("id").eq("department_id", deletingDept.id),
        supabase.from("standalone_documents").select("id", { count: "exact", head: true }).eq("department_id", deletingDept.id),
      ]);

      if (cancelled) return;

      const courseIds = (coursesListRes.data || []).map((c: any) => c.id);

      // lecture_notes has no direct department_id column — it's only linked
      // via course_id, so we count through the department's own courses.
      const lectureNotesRes = courseIds.length
        ? await supabase.from("lecture_notes").select("id", { count: "exact", head: true }).in("course_id", courseIds)
        : { count: 0 };

      if (cancelled) return;

      setDeleteImpact({
        courses: courseIds.length,
        lectureNotes: lectureNotesRes.count || 0,
        standaloneDocs: standaloneDocsRes.count || 0,
      });
      setLoadingImpact(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [deletingDept]);

  const handleEdit = (dept: any) => {
    setEditingDept({
      id: dept.id,
      name: dept.name,
      color: dept.color || "",
      icon: dept.icon || "",
      is_visible: dept.is_visible !== false,
      category_id: dept.category_id || null,
      faculty_id: dept.faculty_id || null,
      background_image_url: dept.background_image_url || null,
      background_overlay_opacity: dept.background_overlay_opacity ?? 50,
    });
  };

  const handleToggleVisibility = async (dept: any) => {
    try {
      const { error } = await supabase
        .from("departments")
        .update({ is_visible: !dept.is_visible })
        .eq("id", dept.id);

      if (error) throw error;
      toast.success(dept.is_visible ? "Department hidden from users" : "Department visible to users");
      refreshDepartments();
    } catch (error: any) {
      console.error("Error toggling visibility:", error);
      toast.error(error.message || "Failed to update visibility");
    }
  };

  const handleSave = async () => {
    if (!editingDept) return;
    
    if (!editingDept.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("departments")
        .update({
          name: editingDept.name.trim(),
          color: editingDept.color?.trim() || null,
          icon: editingDept.icon?.trim() || null,
          is_visible: editingDept.is_visible,
          category_id: editingDept.category_id || null,
          faculty_id: editingDept.faculty_id || null,
          background_image_url: editingDept.background_image_url || null,
          background_overlay_opacity: editingDept.background_overlay_opacity,
        } as any)
        .eq("id", editingDept.id);

      if (error) throw error;

      toast.success("Department updated successfully");
      setEditingDept(null);
      refreshDepartments();
    } catch (error: any) {
      console.error("Error updating department:", error);
      toast.error(error.message || "Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleCreate = async () => {
    if (!newDept.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setCreating(true);
    try {
      const slug = generateSlug(newDept.name);
      
      // Get the next display order
      const maxOrder = orderedDepts.reduce((max, d) => Math.max(max, d.display_order || 0), 0);
      
      const { error } = await supabase
        .from("departments")
        .insert({
          name: newDept.name.trim(),
          slug: slug,
          color: newDept.color?.trim() || null,
          icon: newDept.icon?.trim() || null,
          display_order: maxOrder + 1,
          is_visible: true,
          category_id: newDept.category_id?.trim() || null,
          faculty_id: newDept.faculty_id?.trim() || null,
          background_image_url: newDept.background_image_url || null,
          background_overlay_opacity: newDept.background_overlay_opacity,
        } as any);

      if (error) throw error;

      toast.success("Department created successfully");
      setShowCreateDialog(false);
      setNewDept({ name: "", color: "", icon: "", category_id: "", faculty_id: "", background_image_url: "", background_overlay_opacity: 50 });
      refreshDepartments();
    } catch (error: any) {
      console.error("Error creating department:", error);
      toast.error(error.message || "Failed to create department");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deletingDept.id);

      if (error) throw error;

      toast.success("Department deleted successfully");
      setDeletingDept(null);
      refreshDepartments();
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast.error(error.message || "Failed to delete department");
    } finally {
      setDeleting(false);
    }
  };

  const handleReorder = async (newOrder: any[]) => {
    setOrderedDepts(newOrder);

    // Save the new order in a single atomic call — previously this looped
    // through individual .update() calls per department, which could leave
    // display_order half-updated if one call in the middle failed.
    try {
      const { error } = await supabase.rpc(
        "reorder_departments" as any,
        { _ordered_ids: newOrder.map((dept) => dept.id) } as any,
      );
      if (error) throw error;

      toast.success("Department order saved");
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Failed to save order");
      // Revert on error
      refreshDepartments();
    }
  };

  if (authLoading || adminLoading || !isAdmin) {
    return <LoadingState message="Verifying access..." />;
  }

  // Preview styles for editing
  const previewStyles = editingDept 
    ? getDepartmentStyles(editingDept.color, 0)
    : null;
  const previewIcon = editingDept?.icon?.trim() || null;
  const previewGlow = previewStyles && previewIcon
    ? getIconGlowStyles(previewStyles.hsl)
    : null;

  // Preview styles for creating
  const createPreviewStyles = getDepartmentStyles(newDept.color || null, orderedDepts.length);
  const createPreviewIcon = newDept.icon.trim() || null;
  const createPreviewGlow = createPreviewIcon ? getIconGlowStyles(createPreviewStyles.hsl) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Department Management"
        subtitle="Create, edit, delete, and reorder departments"
        showBack
        backTo="/admin"
        icon={<Building2 className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Create Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:justify-center">
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Create Department
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowQuickCreateCourse(true)}
            className="gap-2 w-full sm:w-auto"
          >
            <BookPlus className="h-4 w-4" />
            Quick add course
          </Button>
        </div>

        {deptLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading departments...</p>
          </div>
        ) : orderedDepts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No departments found</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create First Department
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Drag and drop to reorder departments. Use the eye icon to show/hide from users.
            </p>
            <Reorder.Group 
              axis="y" 
              values={orderedDepts} 
              onReorder={handleReorder}
              className="space-y-4"
            >
              {orderedDepts.map((dept, index) => {
                const category = categories.find(c => c.id === dept.category_id);
                return (
                  <DepartmentItem
                    key={dept.id}
                    dept={dept}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={setDeletingDept}
                    categoryName={category?.name}
                    onToggleVisibility={handleToggleVisibility}
                  />
                );
              })}
            </Reorder.Group>
          </div>
        )}
      </main>

      <CreateCourseModal
        open={showQuickCreateCourse}
        onClose={() => setShowQuickCreateCourse(false)}
        mode="admin"
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create Department
            </DialogTitle>
            <DialogDescription>
              Add a new department. It will appear in the AFIT PDFs section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Live Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Live Preview
              </Label>
              <div
                className="p-4 rounded-xl relative overflow-hidden min-h-[72px] bg-cover bg-center"
                style={{
                  background: newDept.background_image_url ? undefined : createPreviewStyles.bgLight,
                  backgroundImage: newDept.background_image_url ? `url(${newDept.background_image_url})` : undefined,
                  backgroundSize: newDept.background_image_url ? "cover" : undefined,
                  backgroundPosition: newDept.background_image_url ? "center" : undefined,
                }}
              >
                {newDept.background_image_url && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: newDept.color || "#000000",
                      opacity: newDept.background_overlay_opacity / 100,
                    }}
                  />
                )}
                <div className="flex items-center gap-3 relative">
                  {!newDept.background_image_url && createPreviewIcon && createPreviewGlow && (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: createPreviewStyles.accentBg,
                        boxShadow: `0 4px 20px ${createPreviewStyles.glowColor}, 0 0 40px ${createPreviewStyles.glowIntense}`,
                      }}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          filter: createPreviewGlow.filter,
                          textShadow: createPreviewGlow.textShadow,
                        }}
                      >
                        {createPreviewIcon}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-white">
                      {newDept.name || "Department Name"}
                    </h4>
                    <p className="text-xs text-white/80">View Courses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newDeptName">Department Name *</Label>
                <Input
                  id="newDeptName"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newDeptColor">
                  Color
                  <span className="text-xs text-muted-foreground ml-2">
                    (name or code, e.g., "emerald", "#10B981")
                  </span>
                </Label>
                <Input
                  id="newDeptColor"
                  value={newDept.color}
                  onChange={(e) => setNewDept({ ...newDept, color: e.target.value })}
                  placeholder="Leave empty for auto-generated"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newDeptIcon">
                  Icon
                  <span className="text-xs text-muted-foreground ml-2">
                    (emoji — only used when no background image is set)
                  </span>
                </Label>
                <Input
                  id="newDeptIcon"
                  value={newDept.icon}
                  onChange={(e) => setNewDept({ ...newDept, icon: e.target.value })}
                  placeholder="Leave empty for auto-assigned"
                />
              </div>

              <TileImageUpload
                kind="department"
                value={newDept.background_image_url}
                onChange={(url) =>
                  setNewDept({ ...newDept, background_image_url: url || "" })
                }
              />

              {newDept.background_image_url && (
                <div className="space-y-2">
                  <Label>
                    Color overlay strength
                    <span className="text-xs text-muted-foreground ml-2">
                      0% = pure image &nbsp;·&nbsp; 100% = pure color
                    </span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[newDept.background_overlay_opacity]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([next]) => setNewDept({ ...newDept, background_overlay_opacity: next })}
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                      {newDept.background_overlay_opacity}%
                    </span>
                  </div>
                </div>
              )}

              {/* Category Selector */}
              <div className="space-y-2">
                <Label htmlFor="newDeptCategory">
                  Category
                  <span className="text-xs text-muted-foreground ml-2">
                    (for signup page grouping)
                  </span>
                </Label>
                <Select
                  value={newDept.category_id}
                  onValueChange={(value) => setNewDept({ ...newDept, category_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="newDeptCategory">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Faculty Selector */}
              <div className="space-y-2">
                <Label htmlFor="newDeptFaculty">
                  Faculty
                  <span className="text-xs text-muted-foreground ml-2">
                    (which faculty this department belongs to)
                  </span>
                </Label>
                <Select
                  value={newDept.faculty_id}
                  onValueChange={(value) => setNewDept({ ...newDept, faculty_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="newDeptFaculty">
                    <SelectValue placeholder="— No Faculty (Standalone) —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No Faculty (Standalone) —</SelectItem>
                    {faculties.map((fac) => (
                      <SelectItem key={fac.id} value={fac.id}>
                        {fac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDept} onOpenChange={() => setEditingDept(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Edit Department
            </DialogTitle>
            <DialogDescription>
              Update department name, color, icon, and visibility.
            </DialogDescription>
          </DialogHeader>

          {editingDept && previewStyles && (
            <div className="space-y-5 py-4">
              {/* Live Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Live Preview
                </Label>
                <div
                  className="p-4 rounded-xl relative overflow-hidden min-h-[72px] bg-cover bg-center"
                  style={{
                    background: editingDept.background_image_url ? undefined : previewStyles.bgLight,
                    backgroundImage: editingDept.background_image_url ? `url(${editingDept.background_image_url})` : undefined,
                    backgroundSize: editingDept.background_image_url ? "cover" : undefined,
                    backgroundPosition: editingDept.background_image_url ? "center" : undefined,
                  }}
                >
                  {editingDept.background_image_url && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: editingDept.color || "#000000",
                        opacity: editingDept.background_overlay_opacity / 100,
                      }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative">
                    {!editingDept.background_image_url && previewIcon && previewGlow && (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: previewStyles.accentBg,
                          boxShadow: `0 4px 20px ${previewStyles.glowColor}, 0 0 40px ${previewStyles.glowIntense}`,
                        }}
                      >
                        <span
                          className="text-2xl"
                          style={{
                            filter: previewGlow.filter,
                            textShadow: previewGlow.textShadow,
                          }}
                        >
                          {previewIcon}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-white">
                        {editingDept.name || "Department Name"}
                      </h4>
                      <p className="text-xs text-white/80">View Courses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deptName">Department Name</Label>
                  <Input
                    id="deptName"
                    value={editingDept.name}
                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                    placeholder="e.g., Computer Science"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deptColor">
                    Color
                    <span className="text-xs text-muted-foreground ml-2">
                      (name or code, e.g., "emerald", "#10B981")
                    </span>
                  </Label>
                  <Input
                    id="deptColor"
                    value={editingDept.color || ""}
                    onChange={(e) => setEditingDept({ ...editingDept, color: e.target.value })}
                    placeholder="Leave empty for auto-generated"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deptIcon">
                    Icon
                    <span className="text-xs text-muted-foreground ml-2">
                      (emoji — only used when no background image is set)
                    </span>
                  </Label>
                  <Input
                    id="deptIcon"
                    value={editingDept.icon || ""}
                    onChange={(e) => setEditingDept({ ...editingDept, icon: e.target.value })}
                    placeholder="Leave empty for auto-assigned"
                  />
                </div>

                <TileImageUpload
                  kind="department"
                  value={editingDept.background_image_url}
                  onChange={(url) =>
                    setEditingDept({ ...editingDept, background_image_url: url })
                  }
                />

                {editingDept.background_image_url && (
                  <div className="space-y-2">
                    <Label>
                      Color overlay strength
                      <span className="text-xs text-muted-foreground ml-2">
                        0% = pure image &nbsp;·&nbsp; 100% = pure color
                      </span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[editingDept.background_overlay_opacity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([next]) => setEditingDept({ ...editingDept, background_overlay_opacity: next })}
                        className="flex-1"
                      />
                      <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                        {editingDept.background_overlay_opacity}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="deptVisible">Visible to users in signup/selection dropdowns</Label>
                  <Switch
                    id="deptVisible"
                    checked={editingDept.is_visible}
                    onCheckedChange={(checked) => setEditingDept({ ...editingDept, is_visible: checked })}
                  />
                </div>

                {/* Category Selector */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="editDeptCategory">
                    Category
                    <span className="text-xs text-muted-foreground ml-2">
                      (for signup page grouping)
                    </span>
                  </Label>
                  <Select
                    value={editingDept.category_id || "none"}
                    onValueChange={(value) => setEditingDept({ ...editingDept, category_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger id="editDeptCategory">
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Faculty Selector */}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="editDeptFaculty">
                    Faculty
                    <span className="text-xs text-muted-foreground ml-2">
                      (which faculty this department belongs to)
                    </span>
                  </Label>
                  <Select
                    value={editingDept.faculty_id || "none"}
                    onValueChange={(value) => setEditingDept({ ...editingDept, faculty_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger id="editDeptFaculty">
                      <SelectValue placeholder="— No Faculty (Standalone) —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No Faculty (Standalone) —</SelectItem>
                      {faculties.map((fac) => (
                        <SelectItem key={fac.id} value={fac.id}>
                          {fac.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDept(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDept} onOpenChange={() => setDeletingDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDept?.name}"? This action cannot be undone.
              <br /><br />
              {loadingImpact ? (
                <span className="text-muted-foreground">Checking what this will affect…</span>
              ) : deleteImpact && (deleteImpact.courses > 0 || deleteImpact.lectureNotes > 0 || deleteImpact.standaloneDocs > 0) ? (
                <span className="text-destructive font-medium">
                  This will permanently delete {deleteImpact.courses} course{deleteImpact.courses === 1 ? "" : "s"},{" "}
                  {deleteImpact.lectureNotes} lecture note{deleteImpact.lectureNotes === 1 ? "" : "s"}, and{" "}
                  {deleteImpact.standaloneDocs} e-library document{deleteImpact.standaloneDocs === 1 ? "" : "s"} linked to this department.
                </span>
              ) : (
                <span className="text-muted-foreground">No courses, lecture notes, or e-library documents are linked to this department.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || loadingImpact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
