import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type Department = Tables<"departments">;

// Fetch department by slug using a direct REST call with the anon key.
// This bypasses the Supabase JS client's auth headers so RLS doesn't block
// unauthenticated reads — the anon key alone is enough to read public data
// once the correct policy is in place, but this also works via apikey header.
async function fetchDeptBySlug(slug: string): Promise<Department | null> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/departments?slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      // No Authorization header → treated as anon by Supabase
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data as Department[])[0] ?? null;
}

export function useDepartmentBySlug(deptSlug?: string) {
  return useQuery({
    queryKey: ["departmentBySlug", deptSlug],
    enabled: !!deptSlug,
    staleTime: 60_000,
    queryFn: () => fetchDeptBySlug(deptSlug!),
  });
}
