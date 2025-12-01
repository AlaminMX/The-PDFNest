import { useNavigate } from "react-router-dom";
import { useDepartments } from "@/hooks/useDepartments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AFITPDFs() {
  const navigate = useNavigate();
  const { departments, loading } = useDepartments();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading departments...</p>
        </div>
      </div>
    );
  }

  const level100Departments = departments.filter(dept => 
    dept.slug === "computer-science" || dept.slug === "cyber-security"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">AFIT PDFs</h1>
              <p className="text-sm text-muted-foreground">100 Level Lecture Notes</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access lecture notes uploaded by course representatives for your department
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {level100Departments.map((dept) => (
            <Card
              key={dept.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2"
              onClick={() => navigate(`/afit-pdfs/${dept.slug}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{dept.name}</CardTitle>
                      <CardDescription>100 Level</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse lecture notes uploaded by course reps
                </p>
                <Button className="w-full">
                  View Courses
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {level100Departments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No departments available at this time</p>
          </div>
        )}
      </main>
    </div>
  );
}
