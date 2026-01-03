import { useState, useEffect } from "react";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const BANNER_DISMISSED_KEY = "pdfnest_dept_banner_dismissed";

interface DepartmentBannerProps {
  onSelectDepartment: () => void;
  userId?: string;
  hasDepartment?: boolean;
}

export function DepartmentBanner({ onSelectDepartment, userId, hasDepartment }: DepartmentBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Don't show if user has department
    if (hasDepartment) {
      setDismissed(true);
      return;
    }
    
    // Check if already dismissed (using localStorage for persistence)
    const isDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    setDismissed(!!isDismissed);
  }, [hasDepartment]);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed || hasDepartment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Complete your profile</p>
            <p className="text-xs text-muted-foreground">
              Select your department to personalize your experience
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={onSelectDepartment}>
            Select Department
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
