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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Edit, Palette, Sparkles, Plus, Trash2, GripVertical, Eye, EyeOff, Tag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { getDepartmentStyles, getDepartmentIcon, getIconGlowStyles } from "@/lib/departmentColors";
import { Reorder, useDragControls } from "framer-motion";

interface EditingDepartment {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_visible: boolean;
  category_id: string | null;
  faculty_id: string | null;
}

interface NewDepartment {
  name: string;
  color: string;
  icon: string;
  category_id: string;
  faculty_id: string;
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
  const dragControls = useDragControls();
  const styles = getDepartmentStyles(dept.color, index);
  const icon = getDepartmentIcon(dept.icon, dept.name);
  const iconGlow = getIconGlowStyles(styles.hsl);

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
                <span>Icon: {dept.icon || "Auto"}</span>
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
  const [newDept, setNewDept] = useState<NewDepartment>({ name: "", color: "", icon: "", category_id: "", faculty_id: "" });
  const [creating, setCreating] = useState(false);
  const [deletingDept, setDeletingDept] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderedDepts, setOrderedDepts] = useState<any[]>([]);

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

  const handleEdit = (dept: any) => {
    setEditingDept({
      id: dept.id,
      name: dept.name,
      color: dept.color || "",
      icon: dept.icon || "",
      is_visible: dept.is_visible !== false,
      category_id: dept.category_id || null,
      faculty_id: dept.faculty_id || null,
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
        })
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
        });

      if (error) throw error;

      toast.success("Department created successfully");
      setShowCreateDialog(false);
      setNewDept({ name: "", color: "", icon: "", category_id: "", faculty_id: "" });
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
    
    // Update display_order in database for all reordered items
    try {
      const updates = newOrder.map((dept, index) => ({
        id: dept.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("departments")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
      
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
  const previewIcon = editingDept 
    ? getDepartmentIcon(editingDept.icon, editingDept.name)
    : null;
  const previewGlow = previewStyles 
    ? getIconGlowStyles(previewStyles.hsl)
    : null;

  // Preview styles for creating
  const createPreviewStyles = getDepartmentStyles(newDept.color || null, orderedDepts.length);
  const createPreviewIcon = getDepartmentIcon(newDept.icon || null, newDept.name || "New Department");
  const createPreviewGlow = getIconGlowStyles(createPreviewStyles.hsl);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Department Management"
        subtitle="Create, edit, delete, and reorder departments"
        showBack
        icon={<Building2 className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Create Button */}
        <div className="flex justify-center">
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Department
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
                className="p-4 rounded-xl"
                style={{ background: createPreviewStyles.bgLight }}
              >
                <div className="flex items-center gap-3">
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
                  <div>
                    <h4 className="font-semibold text-white">
                      {newDept.name || "Department Name"}
                    </h4>
                    <p className="text-xs text-muted-foreground">View Courses</p>
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
                    (emoji, e.g., 💻, 🔒)
                  </span>
                </Label>
                <Input
                  id="newDeptIcon"
                  value={newDept.icon}
                  onChange={(e) => setNewDept({ ...newDept, icon: e.target.value })}
                  placeholder="Leave empty for auto-assigned"
                />
              </div>

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
                    <SelectValue placeholder="No faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No faculty</SelectItem>
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
                  className="p-4 rounded-xl"
                  style={{ background: previewStyles.bgLight }}
                >
                  <div className="flex items-center gap-3">
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
                          filter: previewGlow?.filter,
                          textShadow: previewGlow?.textShadow,
                        }}
                      >
                        {previewIcon}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        {editingDept.name || "Department Name"}
                      </h4>
                      <p className="text-xs text-muted-foreground">View Courses</p>
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
                      (emoji, e.g., 💻, 🔒)
                    </span>
                  </Label>
                  <Input
                    id="deptIcon"
                    value={editingDept.icon || ""}
                    onChange={(e) => setEditingDept({ ...editingDept, icon: e.target.value })}
                    placeholder="Leave empty for auto-assigned"
                  />
                </div>

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
                      <SelectValue placeholder="No faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No faculty</SelectItem>
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
              <span className="text-destructive font-medium">
                Warning: This may affect courses and lecture notes associated with this department.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
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
