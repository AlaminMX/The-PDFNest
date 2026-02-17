import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SemesterCounts {
  [semester: string]: { courses: number; notes: number };
}

export function useSemesterCounts(departmentId?: string) {
  const [counts, setCounts] = useState<SemesterCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("courses_with_note_counts")
          .select("semester, note_count")
          .eq("department_id", departmentId);

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
  }, [departmentId]);

  return { counts, loading };
}
