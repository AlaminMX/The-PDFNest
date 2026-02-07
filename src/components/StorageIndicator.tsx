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
    <div className="px-3 py-2.5 mx-1 rounded-lg bg-muted/40 border border-border/30">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3 w-3" />
          <span className="font-medium">Storage</span>
        </div>
        <span className={`font-medium ${isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-500 dark:text-amber-400" : ""}`}>
          {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className="h-1.5 bg-muted/60" 
      />
      {isNearLimit && (
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
          <span className={`inline-block size-1.5 rounded-full ${isAtLimit ? 'bg-destructive' : 'bg-amber-500'}`} />
          {isAtLimit ? "Storage limit reached" : "Running low on storage"}
        </p>
      )}
    </div>
  );
}
