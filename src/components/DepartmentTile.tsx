import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { getDepartmentStyles, getDepartmentIcon, getIconGlowStyles } from "@/lib/departmentColors";
import { useMemo } from "react";

interface DepartmentTileProps {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  index: number;
  onClick: () => void;
  subtitle?: string;
}

export function DepartmentTile({
  id,
  name,
  color,
  icon,
  index,
  onClick,
  subtitle = "View Courses",
}: DepartmentTileProps) {
  // Memoize styles to prevent recalculation
  const styles = useMemo(() => getDepartmentStyles(color, index), [color, index]);
  const displayIcon = useMemo(() => getDepartmentIcon(icon, name), [icon, name]);
  const iconGlow = useMemo(() => getIconGlowStyles(styles.hsl), [styles.hsl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-5 rounded-xl transition-all duration-300 group border border-transparent hover:border-white/10"
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
          {/* Icon with glow effect */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
            style={{
              background: styles.accentBg,
              boxShadow: `0 4px 20px ${styles.glowColor}, 0 0 40px ${styles.glowIntense}`,
            }}
          >
            <span
              className="text-2xl transition-all duration-300"
              style={{
                filter: iconGlow.filter,
                textShadow: iconGlow.textShadow,
              }}
            >
              {displayIcon}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold mb-0.5 truncate text-white"
            >
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {/* Arrow */}
          <ChevronRight
            className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200"
          />
        </div>
      </button>
    </motion.div>
  );
}
