import { Plus, Upload, Sparkles, X, PartyPopper } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFireworks } from "./Fireworks";

interface FloatingActionButtonProps {
  onUpload: () => void;
  onAIFeatures?: () => void;
  className?: string;
}

export function FloatingActionButton({ onUpload, onAIFeatures, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { triggerFirework, FireworksComponent } = useFireworks();

  const handleFirework = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger firework from center of screen
    triggerFirework();
  };

  const actions = [
    { icon: Upload, label: "Upload PDF", onClick: onUpload, color: "bg-primary" },
    ...(onAIFeatures ? [{ icon: Sparkles, label: "AI Features", onClick: onAIFeatures, color: "bg-accent-foreground" }] : []),
  ];

  return (
    <>
      <FireworksComponent />
      
      <div className={cn("fixed bottom-20 right-4 z-40 md:bottom-6 flex flex-col-reverse items-end gap-3", className)}>
        {/* Firework button - positioned above the FAB */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleFirework}
          className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-r from-blue-700 to-red-600 text-white hover:from-blue-800 hover:to-red-700 transition-all order-first mb-1"
          title="Celebrate! 🎆"
        >
          <PartyPopper className="w-5 h-5" />
        </motion.button>

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
    </>
  );
}
