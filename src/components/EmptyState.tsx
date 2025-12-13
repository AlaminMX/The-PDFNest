import { FileText, Upload, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "upload" | "ai";
}

const variants = {
  default: {
    icon: <FileText className="h-10 w-10 text-muted-foreground" />,
    gradient: "from-muted/50 to-muted/30",
  },
  upload: {
    icon: <Upload className="h-10 w-10 text-primary" />,
    gradient: "from-primary/10 to-primary/5",
  },
  ai: {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    gradient: "from-accent/30 to-accent/10",
  },
};

export function EmptyState({
  icon,
  title = "No items found",
  description,
  action,
  actionLabel,
  onAction,
  variant = "default",
}: EmptyStateProps) {
  const variantConfig = variants[variant];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className={`mb-6 p-6 rounded-full bg-gradient-to-br ${variantConfig.gradient}`}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {icon || variantConfig.icon}
        </motion.div>
      </motion.div>
      <motion.h3 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold mb-2"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground mb-6 max-w-sm"
        >
          {description}
        </motion.p>
      )}
      {action && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>{action}</motion.div>}
      {!action && actionLabel && onAction && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Button onClick={onAction} className="btn-hover-scale">
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
