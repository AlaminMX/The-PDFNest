import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, ChevronRight, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const ALL_LEVELS = [100, 200, 300, 400, 500];

const LEVEL_LABELS: Record<number, string> = {
  100: "100 Level",
  200: "200 Level",
  300: "300 Level",
  400: "400 Level",
  500: "500 Level",
};

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

  // Fetch which levels actually have courses for this department
  const [activeLevels, setActiveLevels] = useState<number[]>([]);
  const [levelCounts, setLevelCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentDept?.id) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("courses")
        .select("level")
        .eq("department_id", currentDept.id);
      if (data) {
        const counts: Record<number, number> = {};
        data.forEach((row: any) => {
          counts[row.level] = (counts[row.level] || 0) + 1;
        });
        setLevelCounts(counts);
        setActiveLevels(ALL_LEVELS.filter((l) => counts[l] > 0));
      }
      setLoading(false);
    };
    fetch();
  }, [currentDept?.id]);

  if (!deptLoading && !currentDept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Department not found</p>
          <Button onClick={() => navigate("/afit-pdfs")} variant="outline" size="sm">Back to Browse</Button>
        </motion.div>
      </div>
    );
  }

  const displayLevels = activeLevels.length > 0 ? activeLevels : loading ? [] : ALL_LEVELS;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon"
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
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayLevels.map((level, i) => {
              const count = levelCounts[level] || 0;
              return (
                <motion.button
                  key={level}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/afit-pdfs/${facultySlug}/${deptSlug}/level/${level}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/30 transition-all duration-200 group text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    {LEVEL_ICONS[level]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{LEVEL_LABELS[level]}</p>
                    {count > 0 ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count} {count === 1 ? "course" : "courses"} available
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 mt-0.5">No courses yet</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Contribution nudge */}
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
