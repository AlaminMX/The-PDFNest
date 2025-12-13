import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BottomNavProps {
  isLoggedIn: boolean;
  userId?: string;
}

export function BottomNav({ isLoggedIn, userId }: BottomNavProps) {
  const location = useLocation();
  
  const tabs = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Sparkles, label: "AI Features", path: "/ai-features" },
    ...(isLoggedIn && userId
      ? [{ icon: User, label: "Profile", path: `/profile` }]
      : [{ icon: LogIn, label: "Sign In", path: "/auth" }]
    ),
  ];

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t md:hidden safe-area-bottom"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[72px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn("w-5 h-5 relative z-10", isActive && "scale-110")} />
              <span className="text-[10px] font-medium relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
