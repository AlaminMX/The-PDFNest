import { useNavigate, useParams } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { useCourses } from "@/hooks/useCourses";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function DepartmentCoursesContent() {
  const navigate = useNavigate();
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  
  const currentDept = departments.find(d => d.slug === deptSlug);
  const { courses, loading: coursesLoading } = useCourses(currentDept?.id);

  const loading = deptLoading || coursesLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (!currentDept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Department not found</p>
          <Button onClick={() => navigate("/afit-pdfs")}>
            Back to Departments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/afit-pdfs")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentDept.name}</h1>
              <p className="text-sm text-muted-foreground">100 Level Courses</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-muted-foreground">
            Select a course to view available lecture notes
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
              onClick={() => navigate(`/afit-pdfs/${deptSlug}/${course.code}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{course.code}</CardTitle>
                    <CardDescription className="mt-1">{course.name}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {course.note_count} {course.note_count === 1 ? 'note' : 'notes'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  View Lecture Notes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No courses available for this department</p>
          </div>
        )}
      </main>
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
