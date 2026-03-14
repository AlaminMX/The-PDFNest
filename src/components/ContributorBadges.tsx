import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContributorBadge } from "@/hooks/useContributorStats";
import { cn } from "@/lib/utils";

interface BadgeConfig {
  label: string;
  description: string;
  emoji: string;
  color: string;
}

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  first_upload: {
    label: "First Upload",
    description: "Submitted your first material",
    emoji: "🌱",
    color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
  },
  course_helper: {
    label: "Course Helper",
    description: "5+ approved uploads",
    emoji: "📚",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
  },
  department_contributor: {
    label: "Dept. Contributor",
    description: "10+ approved uploads in one department",
    emoji: "🏛️",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
  },
  top_contributor: {
    label: "Top Contributor",
    description: "25+ approved uploads or Top 3 on leaderboard",
    emoji: "🏆",
    color: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
  },
};

interface ContributorBadgesProps {
  badges: ContributorBadge[];
  /** If true, also show locked (un-earned) badges in grey */
  showLocked?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ContributorBadges({
  badges,
  showLocked = false,
  size = "md",
  className,
}: ContributorBadgesProps) {
  const earnedTypes = new Set(badges.map((b) => b.badge_type));
  const allTypes = Object.keys(BADGE_CONFIG);
  const displayTypes = showLocked ? allTypes : allTypes.filter((t) => earnedTypes.has(t));

  if (displayTypes.length === 0 && !showLocked) {
    return (
      <p className="text-xs text-muted-foreground italic">No badges earned yet</p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayTypes.map((type) => {
        const config = BADGE_CONFIG[type];
        const earned = earnedTypes.has(type);
        if (!config) return null;

        return (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-opacity",
                  size === "sm" ? "text-xs" : "text-sm",
                  earned ? config.color : "bg-muted/40 border-border text-muted-foreground opacity-40"
                )}
              >
                <span className={size === "sm" ? "text-sm" : "text-base"}>{config.emoji}</span>
                <span className="font-medium">{config.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[180px] text-center">
              {earned ? config.description : `Locked: ${config.description}`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
