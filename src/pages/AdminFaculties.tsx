import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useFaculties } from "@/hooks/useFaculties";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building, Edit, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { TileImageUpload } from "@/components/TileImageUpload";

export default function AdminFaculties() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const { faculties, loading: facultiesLoading, refresh } = useFaculties();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFaculty, setNewFaculty] = useState({
    name: "",
    icon: "",
    color: "",
    backgroundImageUrl: "",
  });
  const [creating, setCreating] = useState(false);

  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingFaculty, setDeletingFaculty] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error("Access denied.");
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const handleCreate = async () => {
    if (!newFaculty.name.trim()) {
      toast.error("Faculty name is required");
      return;
    }
    setCreating(true);
    try {
      const maxOrder = faculties.reduce(
        (max, f) => Math.max(max, f.display_order || 0),
        0,
      );
      const { error } = await supabase.from("faculties" as any).insert({
        name: newFaculty.name.trim(),
        slug: generateSlug(newFaculty.name),
        icon: newFaculty.icon.trim() || null,
        color: newFaculty.color.trim() || null,
        background_image_url: newFaculty.backgroundImageUrl || null,
        display_order: maxOrder + 1,
      } as any);
      if (error) throw error;
      toast.success("Faculty created");
      setShowCreateDialog(false);
      setNewFaculty({ name: "", icon: "", color: "", backgroundImageUrl: "" });
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create faculty");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!editingFaculty) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("faculties" as any)
        .update({
          name: editingFaculty.name.trim(),
          icon: editingFaculty.icon?.trim() || null,
          color: editingFaculty.color?.trim() || null,
          background_image_url:
            editingFaculty.backgroundImageUrl || null,
          is_visible: editingFaculty.is_visible,
        } as any)
        .eq("id", editingFaculty.id);
      if (error) throw error;
      toast.success("Faculty updated");
      setEditingFaculty(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFaculty) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("faculties" as any)
        .delete()
        .eq("id", deletingFaculty.id);
      if (error) throw error;
      toast.success("Faculty deleted");
      setDeletingFaculty(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleVisibility = async (faculty: any) => {
    try {
      const { error } = await supabase
        .from("faculties" as any)
        .update({ is_visible: !faculty.is_visible } as any)
        .eq("id", faculty.id);
      if (error) throw error;
      toast.success(faculty.is_visible ? "Faculty hidden" : "Faculty visible");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  if (authLoading || adminLoading || !isAdmin) {
    return <LoadingState message="Verifying access..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Faculty Management"
        subtitle="Create, edit, and manage faculties"
        showBack
        backTo="/admin"
        icon={<Building className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex justify-center">
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Faculty
          </Button>
        </div>

        {facultiesLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Loading faculties...
            </p>
          </div>
        ) : faculties.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No faculties found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {faculties.map((faculty) => (
              <Card
                key={faculty.id}
                className={`overflow-hidden ${!faculty.is_visible ? "opacity-60" : ""}`}
              >
                <div className="p-4 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg bg-primary/10 bg-cover bg-center flex items-center justify-center text-2xl shrink-0"
                    style={{
                      backgroundImage: faculty.background_image_url
                        ? `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.25)), url(${faculty.background_image_url})`
                        : undefined,
                    }}
                  >
                    {faculty.icon || null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{faculty.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {faculty.department_count} departments · slug:{" "}
                      {faculty.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleToggleVisibility(faculty)}
                    >
                      {faculty.is_visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditingFaculty({
                          id: faculty.id,
                          name: faculty.name,
                          icon: faculty.icon || "",
                          color: faculty.color || "",
                          is_visible: faculty.is_visible,
                          backgroundImageUrl:
                            faculty.background_image_url || "",
                        })
                      }
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeletingFaculty(faculty)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Faculty</DialogTitle>
            <DialogDescription>
              Add a new faculty grouping for departments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newFaculty.name}
                onChange={(e) =>
                  setNewFaculty({ ...newFaculty, name: e.target.value })
                }
                placeholder="e.g. Faculty of Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (emoji) — optional</Label>
              <Input
                value={newFaculty.icon}
                onChange={(e) =>
                  setNewFaculty({ ...newFaculty, icon: e.target.value })
                }
                placeholder="e.g. 🏗️"
              />
              <p className="text-xs text-muted-foreground">
                Only used when no background image is set.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={newFaculty.color}
                onChange={(e) =>
                  setNewFaculty({ ...newFaculty, color: e.target.value })
                }
                placeholder="e.g. blue"
              />
            </div>
            <TileImageUpload
              kind="faculty"
              value={newFaculty.backgroundImageUrl}
              onChange={(url) =>
                setNewFaculty({
                  ...newFaculty,
                  backgroundImageUrl: url || "",
                })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingFaculty}
        onOpenChange={() => setEditingFaculty(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
          </DialogHeader>
          {editingFaculty && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingFaculty.name}
                  onChange={(e) =>
                    setEditingFaculty({
                      ...editingFaculty,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Icon (emoji) — optional</Label>
                <Input
                  value={editingFaculty.icon}
                  onChange={(e) =>
                    setEditingFaculty({
                      ...editingFaculty,
                      icon: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Only used when no background image is set.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={editingFaculty.color}
                  onChange={(e) =>
                    setEditingFaculty({
                      ...editingFaculty,
                      color: e.target.value,
                    })
                  }
                />
              </div>
              <TileImageUpload
                kind="faculty"
                value={editingFaculty.backgroundImageUrl}
                onChange={(url) =>
                  setEditingFaculty({
                    ...editingFaculty,
                    backgroundImageUrl: url || "",
                  })
                }
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingFaculty.is_visible}
                  onCheckedChange={(v) =>
                    setEditingFaculty({ ...editingFaculty, is_visible: v })
                  }
                />
                <Label>Visible to users</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFaculty(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deletingFaculty}
        onOpenChange={() => setDeletingFaculty(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFaculty?.name}"?
              Departments under this faculty will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
