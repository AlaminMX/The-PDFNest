import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Department = Tables<"departments"> & { is_visible?: boolean };

interface UseDepartmentsOptions {
  visibleOnly?: boolean;
}

export function useDepartments(options?: UseDepartmentsOptions) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("departments")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      // Filter by visibility if requested
      if (options?.visibleOnly) {
        query = query.eq("is_visible", true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDepartments(data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [options?.visibleOnly]);

  return { departments, loading, error, refresh: fetchDepartments };
}
