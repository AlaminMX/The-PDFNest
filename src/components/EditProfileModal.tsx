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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvatarUpload } from "./AvatarUpload";
import { toast } from "sonner";
import { useDepartments } from "@/hooks/useDepartments";
import { Trash2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentDisplayName: string;
  currentAvatarUrl?: string | null;
  currentDepartmentId?: string | null;
  currentPhoneNumber?: string | null;
  currentFullName?: string | null;
  currentDateOfBirth?: string | null;
  onUpdateComplete: () => void;
}

export function EditProfileModal({
  open,
  onClose,
  userId,
  currentDisplayName,
  currentAvatarUrl,
  currentDepartmentId,
  currentPhoneNumber,
  currentFullName,
  currentDateOfBirth,
  onUpdateComplete,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [departmentId, setDepartmentId] = useState(currentDepartmentId || "");
  const [phoneNumber, setPhoneNumber] = useState(currentPhoneNumber || "");
  const [fullName, setFullName] = useState(currentFullName || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    currentDateOfBirth ? new Date(currentDateOfBirth) : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const { departments, loading: loadingDepts } = useDepartments({ visibleOnly: true });

  useEffect(() => {
    if (open) {
      setDisplayName(currentDisplayName);
      setAvatarUrl(currentAvatarUrl);
      setDepartmentId(currentDepartmentId || "");
      setPhoneNumber(currentPhoneNumber || "");
      setFullName(currentFullName || "");
      setDateOfBirth(currentDateOfBirth ? new Date(currentDateOfBirth) : undefined);
    }
  }, [open, currentDisplayName, currentAvatarUrl, currentDepartmentId, currentPhoneNumber, currentFullName, currentDateOfBirth]);

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (error) throw error;
      setAvatarUrl(null);
      toast.success("Profile picture removed");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Failed to remove profile picture");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        display_name: displayName.trim(),
        nickname: displayName.trim(),
        phone_number: phoneNumber.trim() || null,
        full_name: fullName.trim() || null,
        date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
      };

      if (departmentId !== (currentDepartmentId || "")) {
        updateData.department_id = departmentId || null;
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="flex flex-col items-center gap-2">
            <AvatarUpload
              currentAvatarUrl={avatarUrl}
              displayName={displayName}
              userId={userId}
              onUploadComplete={(url) => setAvatarUrl(url)}
            />
            {avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-1 text-xs"
                onClick={handleRemoveAvatar}
                disabled={removingAvatar}
              >
                <Trash2 className="w-3 h-3" />
                {removingAvatar ? "Removing..." : "Remove Picture"}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name / Nickname</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+2348012345678"
            />
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal",
                    !dateOfBirth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateOfBirth ? format(dateOfBirth, "PPP") : "Pick your date of birth"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  onSelect={(date) => {
                    setDateOfBirth(date);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  captionLayout="dropdown-buttons"
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId || "none"} onValueChange={(val) => setDepartmentId(val === "none" ? "" : val)}>
              <SelectTrigger id="department">
                <SelectValue placeholder={loadingDepts ? "Loading..." : "Select department (optional)"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">No department</SelectItem>
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
