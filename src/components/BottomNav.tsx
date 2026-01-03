import { Home, Sparkles, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  isLoggedIn: boolean;
  userId?: string;
  showProfileDot?: boolean;
}

export function BottomNav({ isLoggedIn, userId, showProfileDot = false }: BottomNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  // For guests: show Home and AI Features (AI features will prompt login)
  // For logged-in users: show Home, AI Features, and Profile (goes to /profile for their own profile)
  const tabs = [
    { icon: Home, label: "Home", path: "/", showDot: false },
    { icon: Sparkles, label: "AI Features", path: "/ai-features", showDot: false },
    ...(isLoggedIn && userId
      ? [{ icon: User, label: "Profile", path: "/profile", showDot: showProfileDot }]
      : []),
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.showDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
