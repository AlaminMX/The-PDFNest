import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Department = Tables<"departments">;

export function useDepartmentBySlug(deptSlug?: string) {
  return useQuery({
    queryKey: ["departmentBySlug", deptSlug],
    enabled: !!deptSlug,
    staleTime: 60_000,
    queryFn: async () => {
      if (!deptSlug) return null;

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("slug", deptSlug)
        .maybeSingle();

      if (error) throw error;
      return (data as Department) || null;
    },
  });
}
