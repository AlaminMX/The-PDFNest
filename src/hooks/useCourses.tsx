import { useQuery } from "@tanstack/react-query";

export interface CourseWithNoteCount {
  id: string;
  code: string;
  name: string;
  department_id: string;
  level: number;
  semester: string;
  credit_units: number;
  note_count: number;
  lecture_note_count?: number;
  past_question_count?: number;
  handout_count?: number;
  assignment_count?: number;
  tutorial_count?: number;
  other_count?: number;
}

async function fetchCourses(
  departmentId: string,
  level: number,
  semester?: string
): Promise<CourseWithNoteCount[]> {
  let url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/courses_with_note_counts?department_id=eq.${departmentId}&level=eq.${level}&order=code`;
  if (semester) url += `&semester=eq.${semester}`;

  const res = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error("Failed to fetch courses");
  return res.json();
}

export function useCourses(departmentId?: string, level: number = 100, semester?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["courses", departmentId, level, semester],
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    queryFn: () => fetchCourses(departmentId!, level, semester),
  });

  return {
    courses: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
  };
}
