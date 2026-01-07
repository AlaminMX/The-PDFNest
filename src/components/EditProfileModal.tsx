import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarUpload } from "./AvatarUpload";
import { toast } from "sonner";
import { useDepartments } from "@/hooks/useDepartments";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentDisplayName: string;
  currentAvatarUrl?: string | null;
  currentDepartmentId?: string | null;
  onUpdateComplete: () => void;
}

export function EditProfileModal({
  open,
  onClose,
  userId,
  currentDisplayName,
  currentAvatarUrl,
  currentDepartmentId,
  onUpdateComplete,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [departmentId, setDepartmentId] = useState(currentDepartmentId || "");
  const [saving, setSaving] = useState(false);
  const { departments, loading: loadingDepts } = useDepartments({ visibleOnly: true });

  // Reset state when modal opens with new values
  useEffect(() => {
    if (open) {
      setDisplayName(currentDisplayName);
      setAvatarUrl(currentAvatarUrl);
      setDepartmentId(currentDepartmentId || "");
    }
  }, [open, currentDisplayName, currentAvatarUrl, currentDepartmentId]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        display_name: displayName.trim(),
      };

      // Include department if changed
      if (departmentId !== (currentDepartmentId || "")) {
        updateData.department_id = departmentId || null;
        
        // Update department cache
        const deptCacheData = {
          hasDepartment: !!departmentId,
          userId: userId,
          timestamp: Date.now(),
        };
        localStorage.setItem("pdfnest_dept_status", JSON.stringify(deptCacheData));
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profile updated successfully");
      onUpdateComplete();
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your display name, profile picture, and department
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            displayName={displayName}
            userId={userId}
            onUploadComplete={(url) => setAvatarUrl(url)}
          />
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="department">
                <SelectValue placeholder={loadingDepts ? "Loading..." : "Select department (optional)"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="">No department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.icon && <span className="mr-2">{dept.icon}</span>}
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only select if you are a student of AFIT
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
