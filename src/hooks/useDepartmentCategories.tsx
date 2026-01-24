import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DepartmentCategory {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export function useDepartmentCategories() {
  const [categories, setCategories] = useState<DepartmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("department_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, loading, error, refreshCategories: fetchCategories };
}