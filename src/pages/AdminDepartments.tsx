import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useDepartments } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Edit, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { DepartmentTile } from "@/components/DepartmentTile";
import { getDepartmentStyles, getDepartmentIcon, getIconGlowStyles } from "@/lib/departmentColors";

interface EditingDepartment {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export default function AdminDepartments() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const { departments, loading: deptLoading, refresh: refreshDepartments } = useDepartments();
  
  const [editingDept, setEditingDept] = useState<EditingDepartment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  const handleEdit = (dept: any) => {
    setEditingDept({
      id: dept.id,
      name: dept.name,
      color: dept.color || "",
      icon: dept.icon || "",
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Department Management"
        subtitle="Edit department colors, icons, and names"
        showBack
        icon={<Building2 className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {deptLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No departments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 max-w-2xl mx-auto">
            {departments.map((dept, index) => {
              const styles = getDepartmentStyles((dept as any).color, index);
              const icon = getDepartmentIcon((dept as any).icon, dept.name);
              const iconGlow = getIconGlowStyles(styles.hsl);
              
              return (
                <Card 
                  key={dept.id} 
                  className="overflow-hidden transition-all hover:shadow-lg"
                  style={{ borderColor: `${styles.cssHsl}20` }}
                >
                  <div 
                    className="p-4"
                    style={{ background: styles.bgLight }}
                  >
                    <div className="flex items-center gap-4">
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
                        <h3 
                          className="font-semibold text-lg"
                          style={{ color: styles.accentText }}
                        >
                          {dept.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Palette className="w-3 h-3" />
                            {(dept as any).color || "Auto"}
                          </span>
                          <span>•</span>
                          <span>Icon: {(dept as any).icon || "Auto"}</span>
                        </div>
                      </div>

                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(dept)}
                        className="gap-1.5"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingDept} onOpenChange={() => setEditingDept(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Edit Department
            </DialogTitle>
            <DialogDescription>
              Update department name, color, and icon. Changes apply everywhere.
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
                      <h4 
                        className="font-semibold"
                        style={{ color: previewStyles.accentText }}
                      >
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
