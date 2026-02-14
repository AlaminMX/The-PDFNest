import { Upload } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onUpload: () => void;
  className?: string;
}

export function FloatingActionButton({ onUpload, className }: FloatingActionButtonProps) {
  return (
    <div className={cn("fixed bottom-20 right-4 z-40 md:bottom-6", className)}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onUpload}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-primary text-primary-foreground"
        title="Upload PDF"
      >
        <Upload className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
