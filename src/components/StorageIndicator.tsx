import { Progress } from "@/components/ui/progress";
import { HardDrive } from "lucide-react";

interface StorageIndicatorProps {
  storageUsed: number;
  storageLimit?: number;
}

export function StorageIndicator({ storageUsed, storageLimit = 300 * 1024 * 1024 }: StorageIndicatorProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const percentage = (storageUsed / storageLimit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 95;

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-3.5 w-3.5" />
          <span>Storage</span>
        </div>
        <span className={isAtLimit ? "text-destructive font-medium" : isNearLimit ? "text-yellow-600 dark:text-yellow-500 font-medium" : ""}>
          {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className="h-1.5" 
      />
      {isNearLimit && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {isAtLimit ? "Storage limit reached" : "Running low on storage"}
        </p>
      )}
    </div>
  );
}