import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFaculties } from "@/hooks/useFaculties";
import { useDepartments } from "@/hooks/useDepartments";
import { getDepartmentStyles, getDepartmentIcon } from "@/lib/departmentColors";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Upload, ArrowRight, ChevronDown,
  GraduationCap, Users, Search, Building2,
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

// ─── Department Grid ─────────────────────────────────────────────────────────

interface DeptWithFaculty {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  is_visible: boolean;
  faculty_id: string | null;
  facultySlug?: string;
}

function DeptSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-muted/60 mb-3" />
      <div className="h-3.5 bg-muted/60 rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted/40 rounded w-1/2" />
    </div>
  );
}

function DeptCard({
  dept,
  index,
  onClick,
}: {
  dept: DeptWithFaculty;
  index: number;
  onClick: () => void;
}) {
  const styles = getDepartmentStyles(dept.color, index);
  const icon = getDepartmentIcon(dept.icon, dept.name);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative text-left rounded-xl border transition-all duration-200 p-4 w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
      style={{
        backgroundColor: hovered ? styles.bgHover : styles.bgLight,
        borderColor: hovered
          ? `hsla(${styles.hsl.h}, ${styles.hsl.s}%, ${styles.hsl.l}%, 0.35)`
          : `hsla(${styles.hsl.h}, ${styles.hsl.s}%, ${styles.hsl.l}%, 0.18)`,
        boxShadow: hovered ? `0 4px 20px -4px ${styles.glowColor}` : "none",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: styles.accentBg }}
      >
        {icon}
      </div>
      <p
        className="text-sm font-semibold leading-snug line-clamp-2 mb-1"
        style={{ color: styles.accentText }}
      >
        {dept.name}
      </p>
      <div className="flex items-center gap-1 mt-auto">
        <span className="text-[11px] text-muted-foreground/60">View courses</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function DepartmentGrid({ sectionRef }: { sectionRef: React.RefObject<HTMLElement> }) {
  const { faculties } = useFaculties();
  const { departments, loading } = useDepartments({ visibleOnly: true });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const enriched: DeptWithFaculty[] = departments.map((d) => {
    const fac = faculties.find((f) => f.id === d.faculty_id);
    return { ...d, facultySlug: fac?.slug };
  });

  const filtered = search.trim()
    ? enriched.filter((d) =>
        d.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : enriched;

  const handleDeptClick = (dept: DeptWithFaculty) => {
    if (dept.facultySlug) {
      navigate(`/afit-pdfs/${dept.facultySlug}/${dept.slug}`);
    } else {
      navigate("/afit-pdfs");
    }
  };

  return (
    <section ref={sectionRef} id="departments" className="px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Choose Your Department
          </h2>
          <p className="text-sm text-muted-foreground">
            Tap your department to access lecture notes and past questions instantly
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border/50 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <DeptSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No departments found for "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="text-xs text-primary underline mt-2"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((dept, i) => (
              <DeptCard
                key={dept.id}
                dept={dept}
                index={i}
                onClick={() => handleDeptClick(dept)}
              />
            ))}
          </div>
        )}

        {/* Browse by Faculty */}
        <div className="mt-8 text-center">
          <Button
            asChild
            variant="outline"
            className="rounded-xl gap-2 border-border/50 text-sm"
          >
            <Link to="/afit-pdfs">
              <Building2 className="w-3.5 h-3.5" />
              Browse by Faculty
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
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
        <DepartmentGrid sectionRef={deptSectionRef} />
        <ContributeSection />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
}
