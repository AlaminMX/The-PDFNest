import { useState, useEffect, useRef } from "react";
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

// Module-level cache so repeated mounts (sidebar + landing page) share one fetch
let _cache: Faculty[] | null = null;
let _cacheTime = 0;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function useFaculties() {
  const [faculties, setFaculties] = useState<Faculty[]>(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFaculties = async (force = false) => {
    // Serve from cache if still fresh
    if (!force && _cache && Date.now() - _cacheTime < STALE_MS) {
      setFaculties(_cache);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Parallel fetch: faculties + dept counts in one round-trip
      const [{ data, error: facErr }, { data: deptData }] = await Promise.all([
        supabase
          .from("faculties")
          .select("*")
          .eq("is_visible", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("departments")
          .select("faculty_id")
          .eq("is_visible", true)
          .not("faculty_id", "is", null),
      ]);

      if (facErr) throw facErr;

      const countMap = new Map<string, number>();
      (deptData || []).forEach((d: any) => {
        countMap.set(d.faculty_id, (countMap.get(d.faculty_id) || 0) + 1);
      });

      const enriched = ((data as any[]) || []).map((f: any) => ({
        ...f,
        department_count: countMap.get(f.id) || 0,
      }));

      _cache = enriched;
      _cacheTime = Date.now();
      setFaculties(enriched);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("useFaculties:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch faculties");
      // Serve stale cache on error so page isn't blank
      if (_cache) setFaculties(_cache);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
    return () => abortRef.current?.abort();
  }, []);

  return { faculties, loading, error, refresh: () => fetchFaculties(true) };
}
