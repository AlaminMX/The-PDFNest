import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SemesterCounts {
  [semester: string]: { courses: number; notes: number };
}

export function useSemesterCounts(departmentId?: string, level?: number) {
  const [counts, setCounts] = useState<SemesterCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        // Direct REST fetch — works for all users including guests
        let url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/courses_with_note_counts?department_id=eq.${departmentId}&select=semester,note_count`;
        if (level) url += `&level=eq.${level}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = res.ok ? await res.json() : [];
        const error = null;

        if (error) throw error;

        const result: SemesterCounts = { first: { courses: 0, notes: 0 }, second: { courses: 0, notes: 0 } };
        (data || []).forEach((row: any) => {
          const sem = row.semester || "first";
          if (!result[sem]) result[sem] = { courses: 0, notes: 0 };
          result[sem].courses += 1;
          result[sem].notes += (row.note_count || 0);
        });
        setCounts(result);
      } catch (err) {
        console.error("Error fetching semester counts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [departmentId, level]);

  return { counts, loading };
}
