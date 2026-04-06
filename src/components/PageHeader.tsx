import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [searchOpen, setSearchOpen] = useState(false);

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
              {showBack && (
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
                <h1 className="text-xl md:text-2xl font-bold truncate">{title}</h1>
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
        </div>
      </header>
    </>
  );
}
