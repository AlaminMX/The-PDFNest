import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-5xl">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/pdfnest-logo.png" alt="PDFNest" className="h-7 w-7" />
          <span className="font-semibold text-foreground text-lg">PDFNest</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Log In</Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
