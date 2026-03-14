import { Upload, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onUpload: () => void;
  onContribute?: () => void;
  className?: string;
}

export function FloatingActionButton({ onUpload, onContribute, className }: FloatingActionButtonProps) {
  return (
    <div className={cn("fixed bottom-20 right-4 z-40 md:bottom-6", className)}>
      <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onUpload}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-primary text-primary-foreground"
        title="Upload PDF"
      >
        <Upload className="w-6 h-6" />
      </motion.button>
      {onContribute && (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onContribute}
      className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-secondary text-secondary-foreground mb-2"
      title="Contribute Material"
     >
    <PlusCircle className="w-5 h-5" />
  </motion.button>
)}
      </div>
    </div>
  );
}
