import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PQCourse {
  id: string;
  code: string;
  name: string;
  level: number;
  semester: string;
  color: string | null;
  created_at: string | null;
  question_count: number;
}

export function usePQCourses(level?: number, semester?: string) {
  const [courses, setCourses] = useState<PQCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("pq_courses_with_counts" as any)
          .select("*")
          .order("code");

        if (level) query = query.eq("level", level);
        if (semester) query = query.eq("semester", semester);

        const { data, error } = await query;
        if (error) throw error;
        setCourses((data || []) as unknown as PQCourse[]);
      } catch (err) {
        console.error("usePQCourses error:", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [level, semester]);

  return { courses, loading };
}
