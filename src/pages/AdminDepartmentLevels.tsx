import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Layers3 } from "lucide-react";
import { toast } from "sonner";
import { getDepartmentLevels } from "@/lib/departmentLevels";

interface Course {
  id: string;
  code: string;
  name: string;
  level: number;
}

export default function AdminDepartmentLevels() {
  const navigate = useNavigate();
  const { deptId } = useParams<{ deptId: string }>();

  const [departmentName, setDepartmentName] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [coursesByLevel, setCoursesByLevel] = useState<Record<number, Course[]>>({});
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deptId) {
      toast.error("Department not found");
      navigate("/admin/departments");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: dept, error: deptError } = await supabase
          .from("departments")
          .select("name")
          .eq("id", deptId)
          .single();

        if (deptError) throw deptError;
        if (!dept) throw new Error("Department not found");

        setDepartmentName(dept.name);

        const allowedLevels = getDepartmentLevels(dept.name);
        setLevels(allowedLevels);

        const { data: courses, error: courseError } = await supabase
          .from("courses")
          .select("id, code, name, level")
          .eq("department_id", deptId)
          .order("level", { ascending: true })
          .order("code", { ascending: true });

        if (courseError) throw courseError;

        const grouped: Record<number, Course[]> = {};
        const initialExpanded: Record<number, boolean> = {};

        allowedLevels.forEach((level) => {
          grouped[level] = [];
          initialExpanded[level] = false;
        });

        (courses || []).forEach((course) => {
          if (grouped[course.level]) {
            grouped[course.level].push(course);
          }
        });

        setCoursesByLevel(grouped);
        setExpandedLevels(initialExpanded);
      } catch (error) {
        console.error("Error loading department levels:", error);
        toast.error("Failed to load department levels");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deptId, navigate]);

  const toggleLevel = (level: number) => {
    setExpandedLevels((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading levels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/departments")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">{departmentName}</h1>
          <p className="text-xs text-muted-foreground">Manage department levels and courses</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {levels.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No levels configured for this department.</p>
          </Card>
        ) : (
          levels.map((level) => {
            const courses = coursesByLevel[level] || [];
            const isExpanded = expandedLevels[level];

            return (
              <Card key={level} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Layers3 className="w-5 h-5 text-primary" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium">{level} Level</p>
                        <p className="text-xs text-muted-foreground">
                          {courses.length} {courses.length === 1 ? "course" : "courses"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{courses.length}</Badge>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/10">
                    {courses.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        No courses added for this level yet.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {courses.map((course) => (
                          <div
                            key={course.id}
                            className="p-4 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-primary" />
                              </div>

                              <div className="min-w-0">
                                <p className="font-medium text-sm break-words">
                                  {course.code || "No Code"}
                                </p>
                                <p className="text-sm text-muted-foreground break-words">
                                  {course.name || "Unnamed course"}
                                </p>
                              </div>
                            </div>

                            <Badge variant="outline" className="shrink-0">
                              {level} Level
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
          }
