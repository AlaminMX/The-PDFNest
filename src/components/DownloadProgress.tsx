import { X, Check, AlertCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { DownloadItem } from "@/hooks/useDownloadManager";

interface DownloadProgressProps {
  downloads: Map<string, DownloadItem>;
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
}

export function DownloadProgress({ downloads, onCancel, onClearCompleted }: DownloadProgressProps) {
  const downloadList = Array.from(downloads.values());
  
  if (downloadList.length === 0) return null;

  const hasCompleted = downloadList.some(d => 
    d.status === "complete" || d.status === "error" || d.status === "cancelled"
  );

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Downloads</span>
            <span className="text-xs text-muted-foreground">
              ({downloadList.length})
            </span>
          </div>
          {hasCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onClearCompleted}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {downloadList.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3 border-b border-border/30 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm truncate flex-1" title={item.fileName}>
                    {item.fileName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "downloading" && item.speed && (
                      <span className="text-xs text-muted-foreground">
                        {item.speed}
                      </span>
                    )}
                    {item.status === "downloading" && (
                      <span className="text-xs font-medium text-primary">
                        {item.progress}%
                      </span>
                    )}
                    {item.status === "complete" && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    {item.status === "cancelled" && (
                      <span className="text-xs text-muted-foreground">Cancelled</span>
                    )}
                    {item.status === "downloading" && (
                      <button
                        onClick={() => onCancel(item.id)}
                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                        title="Cancel download"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className={`h-full transition-colors ${
                      item.status === "error"
                        ? "bg-destructive"
                        : item.status === "complete"
                        ? "bg-green-500"
                        : item.status === "cancelled"
                        ? "bg-muted-foreground"
                        : "bg-primary"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                {item.status === "error" && item.error && (
                  <p className="text-xs text-destructive mt-1">{item.error}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
