import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Search,
  LayoutDashboard,
  Building2,
  UserCog,
  Megaphone,
  Activity,
  ShoppingBag,
  Inbox,
  FileText,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  showBack = false,
  backTo,
  actions,
  icon,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const adminItems = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Faculties", path: "/admin/faculties", icon: Building2 },
    { label: "Departments", path: "/admin/departments", icon: Building2 },
    { label: "Reps", path: "/admin/reps", icon: UserCog },
    { label: "Banners", path: "/admin/banners", icon: Megaphone },
    { label: "Activity", path: "/admin/activity", icon: Activity },
    { label: "Projects", path: "/admin/projects", icon: ShoppingBag },
    { label: "Uploads", path: "/admin/uploads", icon: Inbox },
    { label: "Past Questions", path: "/admin/past-questions", icon: FileText },
  ];
  const showAdminNav =
    showBack &&
    location.pathname.startsWith("/admin") &&
    location.pathname !== "/admin";

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              {showBack && !showAdminNav && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="flex-shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}

              {icon && <div className="flex-shrink-0">{icon}</div>}

              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
              {actions}
              <ThemeToggle />
            </div>
          </div>
          {showAdminNav && (
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    asChild
                    size="sm"
                    variant={active ? "secondary" : "ghost"}
                    className="h-9 shrink-0 gap-2 rounded-full"
                  >
                    <Link to={item.path}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          )}
        </div>
      </header>
    </>
  );
                                               }
