import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

interface CourseWithNoteCount extends Course {
  note_count: number;
}

export function useCourses(departmentId?: string) {
  const [courses, setCourses] = useState<CourseWithNoteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (departmentId) {
      fetchCourses();
    }
  }, [departmentId]);

  const fetchCourses = async () => {
    if (!departmentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: coursesData, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", departmentId)
        .eq("level", 100)
        .order("code");

      if (fetchError) throw fetchError;

      // Fetch note counts for each course
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from("lecture_notes")
            .select("*", { count: "exact", head: true })
            .eq("course_id", course.id);

          return {
            ...course,
            note_count: count || 0,
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  return { courses, loading, error, refresh: fetchCourses };
}
