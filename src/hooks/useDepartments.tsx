import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Department = Tables<"departments">;

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("departments")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      setDepartments(data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  return { departments, loading, error, refresh: fetchDepartments };
}
