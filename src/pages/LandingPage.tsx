import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/hooks/useDepartments";
import { useFaculties } from "@/hooks/useFaculties";

export default function LandingPage() {
  const navigate = useNavigate();
  const departmentsRef = useRef<HTMLElement | null>(null);
  const { departments, loading: departmentsLoading } = useDepartments({ visibleOnly: true });
  const { faculties, loading: facultiesLoading } = useFaculties();

  const facultySlugById = useMemo(
    () =>
      faculties.reduce<Record<string, string>>((acc, faculty) => {
        acc[faculty.id] = faculty.slug;
        return acc;
      }, {}),
    [faculties]
  );

  const departmentCards = useMemo(
    () =>
      departments
        .map((department) => ({
          ...department,
          facultySlug: department.faculty_id ? facultySlugById[department.faculty_id] : undefined,
        }))
        .filter((department) => department.facultySlug),
    [departments, facultySlugById]
  );

  const isDepartmentGridLoading = departmentsLoading || facultiesLoading;

  // Redirect logged-in users to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  const scrollToDepartments = () => {
    departmentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderDepartmentGrid = () => {
    if (isDepartmentGridLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg border border-border/40 bg-muted/30" />
          ))}
        </div>
      );
    }

    if (departmentCards.length > 0) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {departmentCards.map((department) => (
            <Link
              key={department.id}
              to={`/afit-pdfs/${department.facultySlug}/${department.slug}`}
              className="min-h-16 rounded-lg border border-border/50 bg-card px-4 py-4 text-sm md:text-base font-medium hover:bg-accent transition-colors flex items-center"
            >
              {department.name}
            </Link>
          ))}
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-border/40 bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">Departments will appear here shortly.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/afit-pdfs">Browse by Faculty</Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <main>
        <section className="border-b border-border/40">
          <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24 text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Find AFIT Lecture Notes &amp; Past Questions
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
              Access organized academic materials for your department and courses.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button size="lg" onClick={scrollToDepartments}>
                Browse Materials
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contribute">Upload Material</Link>
              </Button>
            </div>
          </div>
        </section>

        <section ref={departmentsRef} id="departments" className="container mx-auto max-w-5xl px-4 py-14 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-center">Choose Your Department</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Tap your department to go directly to your academic materials.
          </p>

          {renderDepartmentGrid()}
        </section>

        <section className="border-y border-border/40 bg-muted/20">
          <div className="container mx-auto max-w-4xl px-4 py-14 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">Help Your Department Grow</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Upload lecture notes, past questions, or handouts to help students in your department.
            </p>
            <Button asChild>
              <Link to="/contribute">Upload Material</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto max-w-4xl px-4 py-14 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">What is PDFNest?</h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            PDFNest is a digital academic library built for AFIT students where lecture notes, past questions, and
            study materials are organized by department and course.
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
