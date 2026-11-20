import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Faculty {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  background_image_url?: string | null;
  background_overlay_opacity?: number | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  department_count?: number;
}

// Module-level cache so repeated mounts (sidebar + landing page) share one fetch
let _cache: Faculty[] | null = null;
let _cacheTime = 0;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function useFaculties({ includeHidden = false } = {}) {
  const [faculties, setFaculties] = useState<Faculty[]>(includeHidden ? [] : _cache ?? []);
  const [loading, setLoading] = useState(includeHidden || _cache === null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFaculties = async (force = false) => {
    // Serve from cache if still fresh
    if (!includeHidden && !force && _cache && Date.now() - _cacheTime < STALE_MS) {
      setFaculties(_cache);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const facultyQuery = supabase.from("faculties").select("*")
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });
      if (!includeHidden) facultyQuery.eq("is_visible", true);

      const [{ data, error: facErr }, { data: deptData }] = await Promise.all([
        facultyQuery,
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

      if (includeHidden) {
        // Admin edits invalidate the public list without caching hidden rows.
        _cache = null;
        _cacheTime = 0;
      } else {
        _cache = enriched;
        _cacheTime = Date.now();
      }
      setFaculties(enriched);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("useFaculties:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch faculties",
      );
      // Serve stale cache on error so page isn't blank
      if (!includeHidden && _cache) setFaculties(_cache);
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
