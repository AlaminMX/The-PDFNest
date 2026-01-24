import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

// From the DB view `public.courses_with_note_counts`
interface CourseWithNoteCount extends Course {
  note_count: number;
  credit_units: number;
}

export function useCourses(departmentId?: string, level: number = 100) {
  const [courses, setCourses] = useState<CourseWithNoteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (departmentId) fetchCourses();
  }, [departmentId, level]);

  const fetchCourses = async () => {
    if (!departmentId) return;

    try {
      setLoading(true);
      setError(null);

      // Use view to avoid N+1 note-count queries.
      const { data: coursesData, error: fetchError } = await supabase
        .from("courses_with_note_counts")
        .select("*")
        .eq("department_id", departmentId)
        .eq("level", level)
        .order("code");

      if (fetchError) throw fetchError;
      setCourses((coursesData as CourseWithNoteCount[]) || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  return { courses, loading, error, refresh: fetchCourses };
}
