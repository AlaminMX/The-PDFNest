import { useState } from "react";
import { Home, User, PlusCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { GuestAuthPrompt } from "./GuestAuthPrompt";

interface BottomNavProps {
  isLoggedIn: boolean;
  userId?: string;
  showProfileDot?: boolean;
  unreadNotifications?: number;
}

export function BottomNav({
  isLoggedIn,
  userId,
  showProfileDot = false,
  unreadNotifications = 0,
}: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState("");

  const tabs = [
    { icon: Home,       label: "Home",       path: "/dashboard",  showDot: false,          badge: 0,                  requiresAuth: false },
    { icon: PlusCircle, label: "Contribute",  path: "/contribute", showDot: false,          badge: 0,                  requiresAuth: true  },
    { icon: User,       label: "Profile",     path: "/profile",    showDot: showProfileDot, badge: 0,                  requiresAuth: true  },
  ];

  const handleTabClick = (tab: typeof tabs[0], e: React.MouseEvent) => {
    if (tab.requiresAuth && !isLoggedIn) {
      e.preventDefault();
      setPromptAction(tab.label === "Contribute" ? "upload materials" : "view your profile");
      setPromptOpen(true);
    }
  };

  return (
    <>
      <GuestAuthPrompt
        open={promptOpen}
        action={promptAction}
        onClose={() => setPromptOpen(false)}
      />

      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.path;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.path}
                to={tab.path}
                onClick={(e) => handleTabClick(tab, e)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative min-h-[48px]",
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
                  {tab.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] leading-none"
                    >
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}
