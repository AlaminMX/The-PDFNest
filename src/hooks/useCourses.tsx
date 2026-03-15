import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

// From the DB view `public.courses_with_note_counts`
interface CourseWithNoteCount extends Course {
  note_count: number;
  credit_units: number;
}

export function useCourses(departmentId?: string, level: number = 100, semester?: string) {
  const [courses, setCourses] = useState<CourseWithNoteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (departmentId) fetchCourses();
  }, [departmentId, level, semester]);

  const fetchCourses = async () => {
    if (!departmentId) return;

    try {
      setLoading(true);
      setError(null);

      // Direct REST fetch — works for all users including guests
      let url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/courses_with_note_counts?department_id=eq.${departmentId}&level=eq.${level}&order=code`;
      if (semester) url += `&semester=eq.${semester}`;

      const res = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const coursesData = res.ok ? await res.json() : [];
      const fetchError = res.ok ? null : new Error("Failed to fetch courses");

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
