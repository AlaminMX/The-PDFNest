import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Upload, ArrowRight, ChevronDown,
  GraduationCap, Users,
} from "lucide-react";

// ─── Nav ────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/pdfnest-logo.png" alt="PDFNest" className="h-7 w-7 rounded-md" />
          <span className="font-bold text-base tracking-tight text-foreground">PDFNest</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-sm">
            <Link to="/auth">Log In</Link>
          </Button>
          <Button asChild size="sm" className="rounded-lg text-sm px-4">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ onBrowse }: { onBrowse: () => void }) {
  return (
    <section className="relative pt-16 pb-14 px-4 text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      </div>
      <div className="relative max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold uppercase tracking-wider">
          <GraduationCap className="w-3 h-3" />
          AFIT Academic Library
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-foreground">
          Find AFIT Lecture Notes
          <br />
          <span className="text-primary">&amp; Past Questions</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Access organized academic materials for your department and courses.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            size="lg"
            onClick={onBrowse}
            className="gap-2 rounded-xl px-7 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
          >
            <BookOpen className="w-4 h-4" />
            Browse Materials
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="gap-2 rounded-xl px-7 text-base font-semibold border-border/60 hover:bg-muted/60"
          >
            <Link to="/auth">
              <Upload className="w-4 h-4" />
              Upload Material
            </Link>
          </Button>
        </div>
        <div className="pt-4 flex justify-center">
          <button
            onClick={onBrowse}
            className="flex flex-col items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Scroll to departments"
          >
            <span className="text-xs">Choose your department</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Browse Section ──────────────────────────────────────────────────────────

function BrowseSection({ sectionRef }: { sectionRef: React.RefObject<HTMLElement> }) {
  return (
    <section ref={sectionRef} id="browse" className="px-4 pb-16">
      <div className="max-w-xl mx-auto text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Choose Your Department
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Browse lecture notes, past questions, and study materials organized by department and course.
        </p>
        <Button asChild size="lg" className="rounded-xl gap-2 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
          <a href="https://pdfnest.vercel.app/afit-pdfs">
            <BookOpen className="w-4 h-4" />
            Browse Materials
          </a>
        </Button>
      </div>
    </section>
  );
}

// ─── Contribute Section ──────────────────────────────────────────────────────

function ContributeSection() {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-8 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/8 rounded-full blur-3xl" />
          </div>
          <div className="relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Help Your Department Grow
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Upload lecture notes, past questions, or handouts to help students in your department.
            </p>
            <Button
              asChild
              className="rounded-xl gap-2 px-6 shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-shadow"
            >
              <Link to="/auth">
                <Upload className="w-4 h-4" />
                Upload Material
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── About ───────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-xl mx-auto text-center space-y-3">
        <h2 className="text-lg font-bold text-foreground">What is PDFNest?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          PDFNest is a digital academic library built for AFIT students where lecture notes,
          past questions, and study materials are organized by department and course.
        </p>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border/40 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/pdfnest-logo.png" alt="PDFNest" className="h-7 w-7 rounded-md" />
            <span className="font-bold text-base text-foreground">PDFNest</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground">
            <Link to="/afit-pdfs" className="hover:text-foreground transition-colors">Materials</Link>
            <Link to="/contribute" className="hover:text-foreground transition-colors">Contribute</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign Up</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Log In</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
        </div>
        <div className="border-t border-border/30 pt-6 text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Built for AFIT Students</p>
          <p className="text-xs text-muted-foreground/60">In collaboration with AFIT Digital Market</p>
          <p className="text-xs text-muted-foreground/40 mt-3">Made with ❤️ by Nexel</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const deptSectionRef = useRef<HTMLElement>(null!);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero onBrowse={() => deptSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        <BrowseSection sectionRef={deptSectionRef} />
        <ContributeSection />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
}
