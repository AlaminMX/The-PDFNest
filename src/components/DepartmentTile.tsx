import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { getDepartmentStyles } from "@/lib/departmentColors";
import { useMemo } from "react";
import { useTheme } from "next-themes";

interface DepartmentTileProps {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  backgroundImageUrl?: string | null;
  index: number;
  onClick: () => void;
  subtitle?: string;
}

export function DepartmentTile({
  id,
  name,
  color,
  icon,
  backgroundImageUrl,
  index,
  onClick,
  subtitle = "View Courses",
}: DepartmentTileProps) {
  const { theme } = useTheme();

  const styles = useMemo(() => getDepartmentStyles(color, index), [color, index]);
  const displayIcon = icon?.trim();

  const hasImage = !!backgroundImageUrl;
  const textColorClass = hasImage
    ? "text-white"
    : theme === "dark"
      ? "text-white"
      : "text-gray-900";

  if (hasImage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.06 }}
      >
        <button
          onClick={onClick}
          className="w-full text-left p-5 rounded-xl transition-all duration-300 group border border-white/10 relative overflow-hidden bg-cover bg-center min-h-[88px] flex items-center"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/15 pointer-events-none" />
          <div className="relative flex items-center gap-4 w-full">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold mb-0.5 truncate ${textColorClass} drop-shadow-md`}>
                {name}
              </h3>
              <p className="text-xs text-white/80">{subtitle}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-5 rounded-xl transition-all duration-300 group border border-transparent hover:border-white/10 dark:hover:border-white/10"
        style={{
          background: styles.bgLight,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = styles.bgHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = styles.bgLight;
        }}
      >
        <div className="flex items-center gap-4">
          {displayIcon && (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
              style={{
                background: styles.accentBg,
                boxShadow: `0 2px 10px ${styles.glowColor}`,
              }}
            >
              <span className="text-2xl transition-all duration-300">
                {displayIcon}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold mb-0.5 truncate ${textColorClass}`}>
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          <ChevronRight
            className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200"
          />
        </div>
      </button>
    </motion.div>
  );
}
