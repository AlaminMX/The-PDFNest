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

  const fetchFaculties = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("faculties" as any)
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Get department counts per faculty
      const { data: deptData } = await supabase
        .from("departments")
        .select("faculty_id")
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  return { faculties, loading, refresh: fetchFaculties };
}
