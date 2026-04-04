import { useNavigate, useParams } from "react-router-dom";
import { usePQCourses } from "@/hooks/usePQCourses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, ChevronRight, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";

const SEMESTER_LABELS: Record<string, string> = { first: "First Semester", second: "Second Semester" };

const COLORS = [
  "hsl(var(--primary))", "hsl(220 70% 50%)", "hsl(160 60% 45%)", "hsl(340 65% 50%)",
  "hsl(45 90% 50%)", "hsl(280 60% 50%)", "hsl(10 75% 55%)", "hsl(200 70% 45%)"
];

export default function PQCourses() {
  const navigate = useNavigate();
  const { level, semester } = useParams<{ level: string; semester: string }>();
  const levelNum = parseInt(level || "100", 10);
  const { courses, loading } = usePQCourses(levelNum, semester);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/past-questions/level/${level}`)} className="rounded-full h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[200px] md:max-w-none">Past Questions</h1>
              <p className="text-xs text-muted-foreground">{level} Level · {SEMESTER_LABELS[semester || "first"]}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-3 rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{courses.length} courses</span> available
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/30 aspect-[4/3]">
              <div className="h-4 w-2/3 bg-muted/50 rounded mb-3" />
              <div className="h-3 w-full bg-muted/50 rounded mb-2" />
              <div className="h-3 w-1/2 bg-muted/50 rounded" />
            </div>
          )) : courses.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
              <button
                onClick={() => navigate(`/past-questions/level/${level}/semester/${semester}/${course.code}`)}
                className="w-full text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 transition-all duration-200 group flex flex-col justify-between min-h-[120px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${course.color || COLORS[i % COLORS.length]}20` }}>
                      <FileText className="w-4 h-4" style={{ color: course.color || COLORS[i % COLORS.length] }} />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="font-semibold text-sm text-primary leading-tight">{course.code}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{course.name}</p>
                </div>
                <div className="mt-2">
                  <Badge variant={course.question_count > 0 ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                    {course.question_count} {course.question_count === 1 ? "file" : "files"}
                  </Badge>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {!loading && courses.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No courses available yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Content coming soon</p>
          </motion.div>
        )}
      </main>
      <SmartBottomNav />
    </div>
  );
}
