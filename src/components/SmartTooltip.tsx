import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  userId?: string;
}

export function SmartTooltip({ 
  id, 
  title, 
  description, 
  position = "bottom", 
  children,
  userId 
}: SmartTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `tooltip-seen-${id}-${userId || 'guest'}`;

  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-popover",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-popover",
    left: "left-full top-1/2 -translate-y-1/2 border-l-popover",
    right: "right-full top-1/2 -translate-y-1/2 border-r-popover",
  };

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="bg-popover border border-border rounded-lg shadow-xl p-3 max-w-xs">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded bg-primary/10 text-primary">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={dismiss}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
