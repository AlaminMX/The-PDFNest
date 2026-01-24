import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TimetableDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface TimetableCourse {
  id: string;
  department_id: string;
  level: number;
  code: string;
  name: string;
  credit_units: number;
}

export interface TimetableSlot {
  id: string;
  course_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export function useDepartmentTimetable(departmentId?: string, level?: number) {
  return useQuery({
    queryKey: ["departmentTimetable", departmentId, level],
    enabled: !!departmentId && typeof level === "number",
    staleTime: 30_000,
    queryFn: async () => {
      if (!departmentId || typeof level !== "number") {
        return { courses: [] as TimetableCourse[], slots: [] as TimetableSlot[] };
      }

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, department_id, level, code, name, credit_units")
        .eq("department_id", departmentId)
        .eq("level", level)
        .order("code");

      if (coursesError) throw coursesError;

      const courseIds = (coursesData || []).map((c) => c.id);
      if (courseIds.length === 0) {
        return { courses: (coursesData as TimetableCourse[]) || [], slots: [] as TimetableSlot[] };
      }

      const { data: slotsData, error: slotsError } = await supabase
        .from("course_timetable_slots")
        .select("id, course_id, day_of_week, start_time, end_time")
        .in("course_id", courseIds)
        .order("day_of_week")
        .order("start_time");

      if (slotsError) throw slotsError;

      return {
        courses: (coursesData as TimetableCourse[]) || [],
        slots: (slotsData as TimetableSlot[]) || [],
      };
    },
  });
}
