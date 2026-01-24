import { useNavigate, useParams } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, BookOpen, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDepartmentBySlug } from "@/hooks/useDepartmentBySlug";
import { DepartmentTimetable } from "@/components/DepartmentTimetable";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useRepStatus } from "@/hooks/useRepStatus";

function DepartmentCoursesContent() {
  const navigate = useNavigate();
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const { data: currentDept, isLoading: deptLoading } = useDepartmentBySlug(deptSlug);
  const { courses, loading: coursesLoading } = useCourses(currentDept?.id, 100);
  const { isAdmin } = useAdminStatus();
  const rep = useRepStatus();

  const canEditTimetable =
    !!currentDept && (isAdmin || (rep.isRep && rep.departmentId === currentDept.id));

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
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
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
                {currentDept?.name || "Loading…"}
              </h1>
              <p className="text-xs text-muted-foreground">100 Level Courses</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-5">
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-5">
            <TabsTrigger value="courses" className="flex items-center justify-center">
              Courses
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center justify-center">
              Timetable
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-lg bg-muted/30"
            >
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{courses.length} courses</span> available
              </p>
            </motion.div>

            <div className="space-y-2">
              {coursesLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/30">
                      <div className="h-4 w-1/3 bg-muted/50 rounded mb-2" />
                      <div className="h-3 w-2/3 bg-muted/50 rounded" />
                    </div>
                  ))
                : courses.map((course) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <button
                        onClick={() => navigate(`/afit-pdfs/${deptSlug}/${course.code}`)}
                        className="w-full text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
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
                                {course.note_count} {course.note_count === 1 ? "note" : "notes"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{course.name}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </button>
                    </motion.div>
                  ))}
            </div>

            {!coursesLoading && courses.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No courses available</p>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="timetable" className="mt-0">
            {currentDept ? (
              <DepartmentTimetable departmentId={currentDept.id} canEdit={canEditTimetable} />
            ) : (
              <div className="rounded-lg border border-border/30 p-6 text-sm text-muted-foreground">Loading timetable…</div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <SmartBottomNav />
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
