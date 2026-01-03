import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDepartments } from "@/hooks/useDepartments";

interface DepartmentSelectPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onComplete?: () => void;
}

const SKIP_PROMPT_KEY = "pdfnest_dept_prompt_skipped";

export function DepartmentSelectPrompt({ 
  open, 
  onOpenChange, 
  userId,
  onComplete 
}: DepartmentSelectPromptProps) {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const { departments, loading: loadingDepts } = useDepartments();

  const handleSave = async () => {
    if (!selectedDepartment) {
      toast.error("Please select a department");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ department_id: selectedDepartment })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Department selected successfully!");
      onOpenChange(false);
      onComplete?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_PROMPT_KEY, "true");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Select Your Department</DialogTitle>
              <DialogDescription className="mt-1">
                Help us personalize your experience by selecting your department.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department (optional)</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger id="department" className="w-full">
                <SelectValue placeholder={loadingDepts ? "Loading..." : "Select your department"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
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
          <Button variant="ghost" onClick={handleSkip} disabled={saving}>
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedDepartment}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useDepartmentPrompt(userId: string | undefined, departmentId: string | null | undefined) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    // Don't show if already has department
    if (departmentId) return;
    
    // Don't show if user skipped this session
    if (sessionStorage.getItem(SKIP_PROMPT_KEY)) return;
    
    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [userId, departmentId]);

  return { showPrompt, setShowPrompt };
}
