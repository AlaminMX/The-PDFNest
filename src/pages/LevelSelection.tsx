import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, ChevronRight, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";
import { useState, useEffect, useMemo } from "react";
import { getDepartmentLevels, getLevelLabel } from "@/lib/departmentLevels";

const LEVEL_ICONS: Record<number, string> = {
  100: "🌱",
  200: "📗",
  300: "📘",
  400: "📙",
  500: "🎓",
};

function LevelSelectionContent() {
  const navigate = useNavigate();
  const { facultySlug, deptSlug } = useParams<{ facultySlug: string; deptSlug: string }>();
  const { data: currentDept, isLoading: deptLoading } = useDepartmentBySlug(deptSlug);
  const departmentLevels = useMemo(
    () => getDepartmentLevels(currentDept?.name || deptSlug),
    [currentDept?.name, deptSlug]
  );

  const [activeLevels, setActiveLevels] = useState<number[]>([]);
  const [levelCounts, setLevelCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentDept?.id) return;

    const run = async () => {
      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/courses?department_id=eq.${currentDept.id}&select=level`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });

        const data = res.ok ? await res.json() : [];
        const counts: Record<number, number> = {};

        (data as any[]).forEach((row) => {
          counts[row.level] = (counts[row.level] || 0) + 1;
        });

        setLevelCounts(counts);
        setActiveLevels(departmentLevels.filter((l) => counts[l] > 0));
      } catch {
        // DepartmentCourses will handle empty states
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [currentDept?.id, departmentLevels]);

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
            Back to Browse
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
              onClick={() => navigate(`/afit-pdfs/${facultySlug}`)}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[200px] md:max-w-none">
                {currentDept?.name || "Loading…"}
              </h1>
              <p className="text-xs text-muted-foreground">Select your level</p>
            </div>
          </div>
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary text-xs font-medium mb-3">
            <GraduationCap className="w-3.5 h-3.5" />
            Choose Level
          </div>
          <h2 className="text-xl font-semibold mb-2">What level are you?</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Select your academic level to see relevant courses and materials
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {departmentLevels.map((level) => (
              <div key={level} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {departmentLevels.map((level, i) => {
              const count = levelCounts[level] || 0;

              return (
                <motion.div
                  key={level}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={count > 0 ? "cursor-pointer" : "cursor-default"}
                  onClick={() =>
                    count > 0 &&
                    navigate(`/afit-pdfs/${facultySlug}/${deptSlug}/level/${level}`)
                  }
                >
                  <div
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                      count > 0
                        ? "bg-muted/20 hover:bg-muted/40 border-border/30 hover:border-primary/30 group"
                        : "bg-muted/10 border-border/20 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform ${
                        count > 0 ? "bg-primary/8 group-hover:scale-105" : "bg-muted/30"
                      }`}
                    >
                      {LEVEL_ICONS[level]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${count === 0 ? "text-muted-foreground" : ""}`}>
                        {getLevelLabel(level)}
                      </p>

                      {count > 0 ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {count} {count === 1 ? "course" : "courses"} available
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/40 mt-0.5 italic">
                          Materials coming soon
                        </p>
                      )}
                    </div>

                    {count > 0 ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 shrink-0 font-medium tracking-wide uppercase">
                        Soon
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 rounded-xl border border-border/30 bg-muted/10 text-center"
        >
          <p className="text-xs text-muted-foreground">
            Missing materials for your level?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary underline underline-offset-2"
            >
              Upload to help your department.
            </button>
          </p>
        </motion.div>
      </main>

      <SmartBottomNav />
    </div>
  );
}

export default function LevelSelection() {
  return <LevelSelectionContent />;
}
