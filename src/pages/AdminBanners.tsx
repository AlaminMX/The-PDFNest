import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { LoadingState } from "@/components/LoadingState";

interface AdminBanner {
  id: string;
  title: string;
  message: string;
  banner_type: string;
  link_url: string | null;
  link_text: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
  is_active: boolean;
  show_profile_dot: boolean;
  show_on_profile: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface BannerFormData {
  title: string;
  message: string;
  banner_type: string;
  link_url: string;
  link_text: string;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  show_profile_dot: boolean;
  show_on_profile: boolean;
  start_date: string;
  end_date: string;
}

const defaultFormData: BannerFormData = {
  title: "",
  message: "",
  banner_type: "inline",
  link_url: "",
  link_text: "",
  gradient_from: "#2563eb",
  gradient_to: "#4f46e5",
  is_active: true,
  show_profile_dot: false,
  show_on_profile: false,
  start_date: "",
  end_date: "",
};

export default function AdminBanners() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState<AdminBanner | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchBanners();
    }
  }, [isAdmin]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      // Admin can see all banners, not just active ones
      const { data, error } = await supabase
        .from("admin_banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData(defaultFormData);
    setShowDialog(true);
  };

  const handleOpenEdit = (banner: AdminBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      message: banner.message,
      banner_type: banner.banner_type,
      link_url: banner.link_url || "",
      link_text: banner.link_text || "",
      gradient_from: banner.gradient_from || "blue-600",
      gradient_to: banner.gradient_to || "indigo-600",
      is_active: banner.is_active,
      show_profile_dot: banner.show_profile_dot,
      show_on_profile: banner.show_on_profile,
      start_date: banner.start_date ? banner.start_date.split("T")[0] : "",
      end_date: banner.end_date ? banner.end_date.split("T")[0] : "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSaving(true);
    try {
      const bannerData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        banner_type: formData.banner_type,
        link_url: formData.link_url.trim() || null,
        link_text: formData.link_text.trim() || null,
        gradient_from: formData.gradient_from.trim() || "blue-600",
        gradient_to: formData.gradient_to.trim() || "indigo-600",
        is_active: formData.is_active,
        show_profile_dot: formData.show_profile_dot,
        show_on_profile: formData.show_on_profile,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("admin_banners")
          .update(bannerData)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast.success("Banner updated successfully");
      } else {
        const { error } = await supabase
          .from("admin_banners")
          .insert(bannerData);
        if (error) throw error;
        toast.success("Banner created successfully");
      }

      setShowDialog(false);
      fetchBanners();
    } catch (error: any) {
      console.error("Error saving banner:", error);
      toast.error(error.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBanner) return;

    try {
      const { error } = await supabase
        .from("admin_banners")
        .delete()
        .eq("id", deletingBanner.id);

      if (error) throw error;
      toast.success("Banner deleted successfully");
      setDeletingBanner(null);
      fetchBanners();
    } catch (error: any) {
      console.error("Error deleting banner:", error);
      toast.error(error.message || "Failed to delete banner");
    }
  };

  const toggleActive = async (banner: AdminBanner) => {
    try {
      const { error } = await supabase
        .from("admin_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);

      if (error) throw error;
      toast.success(banner.is_active ? "Banner deactivated" : "Banner activated");
      fetchBanners();
    } catch (error: any) {
      console.error("Error toggling banner:", error);
      toast.error(error.message || "Failed to update banner");
    }
  };

  if (authLoading || adminLoading || !isAdmin) {
    return <LoadingState message="Verifying access..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Banner Management"
        subtitle="Create and manage announcement banners"
        showBack
        backTo="/admin"
        icon={<Megaphone className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex justify-center">
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Banner
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No banners found</p>
              <Button onClick={handleOpenCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create First Banner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 max-w-3xl mx-auto">
            {banners.map((banner) => (
              <Card key={banner.id} className={!banner.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {banner.title}
                        <Badge variant={banner.banner_type === "popup" ? "default" : "secondary"}>
                          {banner.banner_type}
                        </Badge>
                        {!banner.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {banner.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(banner)}
                        title={banner.is_active ? "Deactivate" : "Activate"}
                      >
                        {banner.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(banner)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingBanner(banner)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {banner.show_profile_dot && (
                      <Badge variant="outline">Profile Dot</Badge>
                    )}
                    {banner.show_on_profile && (
                      <Badge variant="outline">Show on Profile</Badge>
                    )}
                    {banner.link_url && (
                      <Badge variant="outline">Has Link</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Edit Banner" : "Create Banner"}
            </DialogTitle>
            <DialogDescription>
              {editingBanner
                ? "Update the banner details below."
                : "Create a new announcement banner."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Banner title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Banner message"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner_type">Banner Type</Label>
              <Select
                value={formData.banner_type}
                onValueChange={(value: "inline" | "popup") =>
                  setFormData({ ...formData, banner_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline (top of page)</SelectItem>
                  <SelectItem value="popup">Popup (modal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link_url">Link URL (optional)</Label>
                <Input
                  id="link_url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_text">Link Text</Label>
                <Input
                  id="link_text"
                  value={formData.link_text}
                  onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  placeholder="Learn more"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradient_from">Gradient From</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.gradient_from.startsWith("#") ? formData.gradient_from : "#3b82f6"}
                    onChange={(e) => setFormData({ ...formData, gradient_from: e.target.value })}
                    className="h-10 w-12 rounded border border-input cursor-pointer p-0.5"
                  />
                  <Input
                    id="gradient_from"
                    value={formData.gradient_from}
                    onChange={(e) => setFormData({ ...formData, gradient_from: e.target.value })}
                    placeholder="#3b82f6 or blue-600"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradient_to">Gradient To</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.gradient_to.startsWith("#") ? formData.gradient_to : "#6366f1"}
                    onChange={(e) => setFormData({ ...formData, gradient_to: e.target.value })}
                    className="h-10 w-12 rounded border border-input cursor-pointer p-0.5"
                  />
                  <Input
                    id="gradient_to"
                    value={formData.gradient_to}
                    onChange={(e) => setFormData({ ...formData, gradient_to: e.target.value })}
                    placeholder="#6366f1 or indigo-600"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            {/* Live preview */}
            {(formData.gradient_from || formData.gradient_to) && (
              <div
                className="h-10 rounded-lg border"
                style={{
                  background: `linear-gradient(to right, ${formData.gradient_from || "#3b82f6"}, ${formData.gradient_to || "#6366f1"})`,
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date (optional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date (optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show_profile_dot">Show Profile Dot</Label>
                <Switch
                  id="show_profile_dot"
                  checked={formData.show_profile_dot}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_profile_dot: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show_on_profile">Show on Profile Page</Label>
                <Switch
                  id="show_on_profile"
                  checked={formData.show_on_profile}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_on_profile: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingBanner ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBanner} onOpenChange={() => setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBanner?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
