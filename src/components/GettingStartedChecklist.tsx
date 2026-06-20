import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Upload, Folder, Sparkles, Star, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Confetti } from "@/components/Confetti";

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "upload", label: "Upload your first PDF", icon: Upload, description: "Drag & drop or click to upload" },
  { id: "category", label: "Create a category", icon: Folder, description: "Organize your files" },
  { id: "favorite", label: "Star a file", icon: Star, description: "Quick access to important docs" },
];

interface GettingStartedChecklistProps {
  completedItems: string[];
  onDismiss: () => void;
  userId: string;
}

export function GettingStartedChecklist({ completedItems, onDismiss, userId }: GettingStartedChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const progress = (completedItems.length / CHECKLIST_ITEMS.length) * 100;
  const allComplete = completedItems.length === CHECKLIST_ITEMS.length;

  useEffect(() => {
    if (allComplete) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        localStorage.setItem(`checklist-dismissed-${userId}`, 'true');
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, userId, onDismiss]);

  return (
    <>
      {showConfetti && <Confetti />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-card border border-border rounded-xl shadow-lg overflow-hidden mb-6"
      >
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Getting Started</h3>
              <p className="text-xs text-muted-foreground">
                {completedItems.length} of {CHECKLIST_ITEMS.length} complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDismiss(); }}>
              <X className="w-4 h-4" />
            </Button>
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border"
            >
              <div className="p-4 grid gap-3">
                {CHECKLIST_ITEMS.map((item, index) => {
                  const isComplete = completedItems.includes(item.id);
                  const Icon = item.icon;
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        isComplete ? "bg-primary/5" : "bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          isComplete && "line-through text-muted-foreground"
                        )}>
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      {isComplete && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-primary"
                        >
                          <Check className="w-5 h-5" />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
