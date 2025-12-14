import { useNavigate, useParams } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { useCourses } from "@/hooks/useCourses";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, BookOpen, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomNav } from "@/components/BottomNav";
import { useSession } from "@/hooks/useSession";
import { motion } from "framer-motion";

function DepartmentCoursesContent() {
  const navigate = useNavigate();
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  const { session, user } = useSession();
  
  const currentDept = departments.find(d => d.slug === deptSlug);
  const { courses, loading: coursesLoading } = useCourses(currentDept?.id);

  const loading = deptLoading || coursesLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading courses...</p>
        </motion.div>
      </div>
    );
  }

  if (!currentDept) {
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
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/afit-pdfs")}
              className="rounded-full h-9 w-9"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[180px] md:max-w-none">
                {currentDept.name}
              </h1>
              <p className="text-xs text-muted-foreground">100 Level Courses</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        {/* Info Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-lg bg-muted/30"
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{courses.length} courses</span> available
          </p>
        </motion.div>

        {/* Course List */}
        <div className="space-y-2">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <button
                onClick={() => navigate(`/afit-pdfs/${deptSlug}/${course.code}`)}
                className="w-full text-left p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-primary">{course.code}</span>
                      <Badge 
                        variant={course.note_count > 0 ? "secondary" : "outline"} 
                        className="text-[10px] px-1.5 py-0"
                      >
                        {course.note_count} {course.note_count === 1 ? 'note' : 'notes'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {course.name}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {courses.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No courses available</p>
          </motion.div>
        )}
      </main>

      <BottomNav isLoggedIn={!!session} userId={user?.id} />
    </div>
  );
}

export default function DepartmentCourses() {
  return (
    <AuthGate>
      <DepartmentCoursesContent />
    </AuthGate>
  );
}
