import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Faculty {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  department_count?: number;
}

export function useFaculties() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("faculties")
        .select("*")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("useFaculties fetch error:", error);
        throw error;
      }

      // Get department counts per faculty (anon-safe - departments have anon policy)
      const { data: deptData } = await supabase
        .from("departments")
        .select("faculty_id")
        .eq("is_visible", true)
        .not("faculty_id", "is", null);

      const countMap = new Map<string, number>();
      (deptData || []).forEach((d: any) => {
        countMap.set(d.faculty_id, (countMap.get(d.faculty_id) || 0) + 1);
      });

      const enriched = ((data as any[]) || []).map((f: any) => ({
        ...f,
        department_count: countMap.get(f.id) || 0,
      }));

      setFaculties(enriched);
    } catch (err) {
      console.error("Error fetching faculties:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch faculties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  return { faculties, loading, error, refresh: fetchFaculties };
}
