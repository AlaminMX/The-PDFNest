import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDepartmentStyles, getDepartmentIcon } from "@/lib/departmentColors";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { isRecoveryRedirectInProgress } from "@/lib/authRecovery";
import {
  BookOpen, Upload, ArrowRight, ChevronDown,
  GraduationCap, Users, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Faculty {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  display_order: number | null;
  is_visible: boolean;
  department_count?: number;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

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

// ─── Hero ─────────────────────────────────────────────────────────────────────

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
            size="lg"
            variant="outline"
            className="gap-2 rounded-xl px-7 text-base font-semibold border-border/60 hover:bg-muted/60"
            onClick={() => {
              toast.info("Sign in or create a free account to upload materials.", { duration: 3000 });
              setTimeout(() => window.location.href = "/auth", 1500);
            }}
          >
            <Upload className="w-4 h-4" />
            Upload Material
          </Button>
        </div>
        <div className="pt-2 flex justify-center">
          <button
            onClick={onBrowse}
            className="flex flex-col items-center gap-1 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          >
            <span className="text-xs">Choose your faculty</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Faculty Card skeleton ────────────────────────────────────────────────────

function FacultySkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-5 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-muted/50 mb-4" />
      <div className="h-4 bg-muted/50 rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted/30 rounded w-1/2 mb-4" />
      <div className="h-3 bg-muted/20 rounded w-1/3" />
    </div>
  );
}

// ─── Faculty Card ─────────────────────────────────────────────────────────────

function FacultyCard({
  faculty,
  index,
  onClick,
}: {
  faculty: Faculty;
  index: number;
  onClick: () => void;
}) {
  const styles = getDepartmentStyles(faculty.color, index);
  const icon = getDepartmentIcon(faculty.icon, faculty.name);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative text-left rounded-xl border transition-all duration-200 p-5 w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
      style={{
        backgroundColor: hovered ? styles.bgHover : styles.bgLight,
        borderColor: hovered
          ? `hsla(${styles.hsl.h}, ${styles.hsl.s}%, ${styles.hsl.l}%, 0.35)`
          : `hsla(${styles.hsl.h}, ${styles.hsl.s}%, ${styles.hsl.l}%, 0.18)`,
        boxShadow: hovered ? `0 4px 20px -4px ${styles.glowColor}` : "none",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4 transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: styles.accentBg }}
      >
        {icon}
      </div>
      <p
        className="text-sm font-semibold leading-snug mb-1 line-clamp-2"
        style={{ color: styles.accentText }}
      >
        {faculty.name}
      </p>
      {typeof faculty.department_count === "number" && (
        <p className="text-[11px] text-muted-foreground/60">
          {faculty.department_count}{" "}
          {faculty.department_count === 1 ? "dept" : "depts"}
        </p>
      )}
      <div className="flex items-center gap-1 mt-3">
        <span className="text-[11px] text-muted-foreground/50">Browse</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform duration-150" />
      </div>
    </button>
  );
}

// ─── Faculty Grid ─────────────────────────────────────────────────────────────

function FacultyGrid({ sectionRef }: { sectionRef: React.RefObject<HTMLElement> }) {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Fetch visible faculties — works for anon once RLS policy is set
        const { data: facData } = await supabase
          .from("faculties")
          .select("id, name, slug, icon, color, display_order, is_visible")
          .eq("is_visible", true)
          .order("display_order", { ascending: true });

        if (cancelled) return;
        const rows = (facData || []) as Faculty[];

        // Best-effort: enrich with department counts
        try {
          const { data: deptData } = await supabase
            .from("departments")
            .select("faculty_id")
            .eq("is_visible", true)
            .not("faculty_id", "is", null);

          if (!cancelled && deptData) {
            const map = new Map<string, number>();
            deptData.forEach((d: any) => {
              map.set(d.faculty_id, (map.get(d.faculty_id) || 0) + 1);
            });
            setFaculties(rows.map((f) => ({ ...f, department_count: map.get(f.id) ?? 0 })));
          } else if (!cancelled) {
            setFaculties(rows);
          }
        } catch {
          if (!cancelled) setFaculties(rows);
        }
      } catch {
        if (!cancelled) setFaculties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = search.trim()
    ? faculties.filter((f) =>
        f.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : faculties;

  return (
    <section ref={sectionRef} id="faculties" className="px-4 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Choose Your Faculty
          </h2>
          <p className="text-sm text-muted-foreground">
            Select your faculty to browse departments and access materials instantly
          </p>
        </div>

        {/* Search — only after load */}
        {!loading && faculties.length > 0 && (
          <div className="relative max-w-sm mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search faculties..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border/50 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
            />
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FacultySkeleton key={i} />
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((faculty, i) => (
              <FacultyCard
                key={faculty.id}
                faculty={faculty}
                index={i}
                onClick={() => navigate(`/afit-pdfs/${faculty.slug}`)}
              />
            ))}
          </div>
        )}

        {/* No search results */}
        {!loading && faculties.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No faculty matches "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="text-xs text-primary underline mt-2"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Browse by Department link */}
        <div className="mt-8 text-center">
          <Button
            asChild
            variant="outline"
            className="rounded-xl gap-2 border-border/50 text-sm"
          >
            <Link to="/afit-pdfs">
              Browse by Department
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

      </div>
    </section>
  );
}

// ─── Contribute Section ───────────────────────────────────────────────────────

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
              className="rounded-xl gap-2 px-6 shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-shadow"
            onClick={() => {
              toast.info("Sign in or create a free account to upload materials.", { duration: 3000 });
              setTimeout(() => window.location.href = "/auth", 1500);
            }}
            >
              <Upload className="w-4 h-4" />
              Upload Material
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────

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

// ─── Footer ───────────────────────────────────────────────────────────────────

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
            <Link to="/auth" className="hover:text-foreground transition-colors">Contribute</Link>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const facultySectionRef = useRef<HTMLElement>(null!);
  const [checking, setChecking] = useState(true);

  // Redirect logged-in users straight to dashboard before showing the landing UI
  useEffect(() => {
    if (isRecoveryRedirectInProgress()) {
      setChecking(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (isRecoveryRedirectInProgress()) {
        setChecking(false);
        return;
      }
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero
          onBrowse={() =>
            facultySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />
        <FacultyGrid sectionRef={facultySectionRef} />
        <ContributeSection />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
}
