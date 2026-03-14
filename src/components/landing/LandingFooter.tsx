import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 dark:border-white/[0.06] dark:shadow-[0_-1px_0_0_hsl(0_0%_100%/0.04)] py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/pdfnest-logo.png" alt="PDFNest" className="h-8 w-8" />
            <span className="font-semibold text-foreground">PDFNest</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign Up</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Log In</Link>
            <Link to="/afit-pdfs" className="hover:text-foreground transition-colors">AFIT PDFs</Link>
            <Link to="/school-store" className="hover:text-foreground transition-colors">School Store</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-8">
          Built by Nexel 🖤<br /> for students who value organized learning.
        </p>
      </div>
    </footer>
  );
}
