import { Link, useLocation } from "react-router-dom";
import { Home, Upload, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

interface RepBottomNavProps {
  repUserId: string;
  unreadNotifications?: number;
}

export function RepBottomNav({ repUserId, unreadNotifications = 0 }: RepBottomNavProps) {
  const location = useLocation();
  
  const tabs = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Upload, label: "Upload", path: "/rep/upload" },
    { icon: Bell, label: "Notifications", path: "/notifications", badge: unreadNotifications },
    { icon: User, label: "Profile", path: `/rep/${repUserId}` },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[80px] min-h-[48px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {(tab as any).badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] leading-none"
                  >
                    {(tab as any).badge > 9 ? "9+" : (tab as any).badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
