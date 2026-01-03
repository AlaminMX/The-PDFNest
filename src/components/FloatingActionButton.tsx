import { Plus, Upload, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onUpload: () => void;
  onAIFeatures?: () => void;
  className?: string;
}

export function FloatingActionButton({ onUpload, onAIFeatures, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Upload, label: "Upload PDF", onClick: onUpload, color: "bg-primary" },
    ...(onAIFeatures ? [{ icon: Sparkles, label: "AI Features", onClick: onAIFeatures, color: "bg-accent-foreground" }] : []),
  ];

  return (
    <div className={cn("fixed bottom-20 right-4 z-40 md:bottom-6 flex flex-col-reverse items-end gap-3", className)}>
      <AnimatePresence>
        {isOpen && actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-primary-foreground",
              action.color
            )}
          >
            <action.icon className="w-4 h-4" />
            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors",
          isOpen ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}
