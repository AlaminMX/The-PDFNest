import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getDepartmentLevels } from "@/lib/departmentLevels";

interface Course {
  id: string;
  title: string;
  level: number;
}

export default function AdminDepartmentLevels() {
  const navigate = useNavigate();
  const { deptId } = useParams<{ deptId: string }>();

  const [departmentName, setDepartmentName] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [coursesByLevel, setCoursesByLevel] = useState<Record<number, Course[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deptId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch department
        const { data: dept, error: deptError } = await supabase
          .from("departments")
          .select("name")
          .eq("id", deptId)
          .single();

        if (deptError) throw deptError;

        setDepartmentName(dept.name);

        // Get allowed levels for this department
        const allowedLevels = getDepartmentLevels(dept.name);
        setLevels(allowedLevels);

        // Fetch courses
        const { data: courses, error: courseError } = await supabase
          .from("courses")
          .select("id, title, level")
          .eq("department_id", deptId);

        if (courseError) throw courseError;

        // Group by level
        const grouped: Record<number, Course[]> = {};

        allowedLevels.forEach((lvl) => {
          grouped[lvl] = [];
        });

        (courses || []).forEach((course) => {
          if (!grouped[course.level]) return;
          grouped[course.level].push(course);
        });

        setCoursesByLevel(grouped);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load department levels");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading levels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/departments")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{departmentName}</h1>
          <p className="text-xs text-muted-foreground">Manage levels & courses</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {levels.map((level) => {
          const courses = coursesByLevel[level] || [];

          return (
            <Card
              key={level}
              className="p-4 cursor-pointer hover:bg-muted/40 transition"
              onClick={() =>
                navigate(`/admin/departments/${deptId}/levels/${level}`)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>

                  <div>
                    <p className="font-medium">{level} Level</p>
                    <p className="text-xs text-muted-foreground">
                      {courses.length} {courses.length === 1 ? "course" : "courses"}
                    </p>
                  </div>
                </div>

                <span className="text-xs text-muted-foreground">
                  Manage →
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
    }
