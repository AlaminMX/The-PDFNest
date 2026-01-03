import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserDepartmentData {
  departmentId: string | null;
  departmentName: string | null;
  hasDepartment: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUserDepartment(userId: string | undefined): UserDepartmentData {
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDepartment = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          department_id,
          departments (
            name
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      setDepartmentId(data?.department_id || null);
      setDepartmentName(data?.departments?.name || null);
    } catch (error) {
      console.error("Error fetching user department:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartment();
  }, [userId]);

  return {
    departmentId,
    departmentName,
    hasDepartment: !!departmentId,
    loading,
    refresh: fetchDepartment,
  };
}
