import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, GraduationCap, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";
import { useSemesterCounts } from "@/hooks/useSemesterCounts";

const SEMESTERS = [
  { key: "first", label: "First Semester", icon: "📘" },
  { key: "second", label: "Second Semester", icon: "📗" },
] as const;

function SemesterSelectionContent() {
  const navigate = useNavigate();
  const { facultySlug, deptSlug, level } = useParams<{ facultySlug: string; deptSlug: string; level: string }>();
  const levelNum = parseInt(level || '100', 10);
  const { data: currentDept, isLoading: deptLoading } = useDepartmentBySlug(deptSlug);
  const { counts, loading: countsLoading } = useSemesterCounts(currentDept?.id, levelNum);

  if (!deptLoading && !currentDept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-4"
        >
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Department not found</p>
          <Button onClick={() => navigate("/afit-pdfs")} variant="outline" size="sm">
            Back to Departments
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/afit-pdfs/${facultySlug}/${deptSlug}`)}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[200px] md:max-w-none">
                {currentDept?.name || "Loading…"}
              </h1>
              <p className="text-xs text-muted-foreground">{level ? `${level} Level` : ''} · Select semester</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-xs font-medium mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            Choose Semester
          </div>
          <h2 className="text-xl font-semibold mb-2">
            Which semester?
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Select a semester to view available courses and lecture notes
          </p>
        </motion.div>

        <div className="grid gap-4 max-w-md mx-auto">
          {SEMESTERS.map((sem, index) => {
            const courseCount = counts[sem.key]?.courses ?? 0;
            const noteCount = counts[sem.key]?.notes ?? 0;

            return (
              <motion.div
                key={sem.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <button
                  onClick={() => navigate(`/afit-pdfs/${facultySlug}/${deptSlug}/level/${level}/semester/${sem.key}`)}
                  className="w-full text-left p-6 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 text-3xl">
                      {sem.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1">{sem.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {countsLoading ? (
                          <span className="inline-block w-24 h-3 bg-muted/50 rounded animate-pulse" />
                        ) : (
                          <>
                            {courseCount} {courseCount === 1 ? "course" : "courses"} · {noteCount}{" "}
                            {noteCount === 1 ? "note" : "notes"}
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>

      <SmartBottomNav />
    </div>
  );
}

export default function SemesterSelection() {
  return <SemesterSelectionContent />;
}
