import { useEffect, useState } from "react";

interface SemesterCountItem {
  courses: number;
  notes: number;
}

interface SemesterCounts {
  [semester: string]: SemesterCountItem;
}

const EMPTY_COUNTS: SemesterCounts = {
  first: { courses: 0, notes: 0 },
  second: { courses: 0, notes: 0 },
};

export function useSemesterCounts(departmentId?: string, level?: number) {
  const [counts, setCounts] = useState<SemesterCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!departmentId) {
      setCounts(EMPTY_COUNTS);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchSemesterCounts = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          department_id: `eq.${departmentId}`,
          select: "semester,note_count",
        });

        if (typeof level === "number" && !Number.isNaN(level)) {
          params.set("level", `eq.${level}`);
        }

        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/courses_with_note_counts?${params.toString()}`;

        const res = await window.fetch(url, {
          method: "GET",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch semester counts (${res.status})`);
        }

        const data: Array<{ semester?: string | null; note_count?: number | null }> =
          await res.json();

        const nextCounts: SemesterCounts = {
          first: { courses: 0, notes: 0 },
          second: { courses: 0, notes: 0 },
        };

        for (const row of data ?? []) {
          const semesterKey = row.semester === "second" ? "second" : "first";
          const noteCount = Number(row.note_count ?? 0);

          nextCounts[semesterKey].courses += 1;
          nextCounts[semesterKey].notes += Number.isFinite(noteCount) ? noteCount : 0;
        }

        setCounts(nextCounts);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Error fetching semester counts:", err);
        setCounts(EMPTY_COUNTS);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSemesterCounts();

    return () => controller.abort();
  }, [departmentId, level]);

  return { counts, loading };
}
