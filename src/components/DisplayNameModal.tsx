import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DisplayNameModalProps {
  open: boolean;
  onComplete: () => void;
}

export function DisplayNameModal({ open, onComplete }: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Display name saved!");
      onComplete();
    } catch (error) {
      console.error("Error saving display name:", error);
      toast.error("Failed to save display name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome, Course Rep! 🎓</DialogTitle>
          <DialogDescription>
            What name should appear publicly when you upload materials?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="e.g., John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            This name will be visible on all lecture notes you upload. You can change it later in your settings.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || !displayName.trim()}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
