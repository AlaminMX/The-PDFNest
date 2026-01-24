-- 1) Extend courses with credit units
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS credit_units integer NOT NULL DEFAULT 0;

-- 2) Timetable slots (multiple slots per course)
CREATE TABLE IF NOT EXISTS public.course_timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_timetable_slots_course_id
  ON public.course_timetable_slots(course_id);

CREATE INDEX IF NOT EXISTS idx_course_timetable_slots_day_time
  ON public.course_timetable_slots(day_of_week, start_time);

-- 3) updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_course_timetable_slots_updated_at ON public.course_timetable_slots;
CREATE TRIGGER set_course_timetable_slots_updated_at
BEFORE UPDATE ON public.course_timetable_slots
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS: timetable slots
ALTER TABLE public.course_timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view timetable slots" ON public.course_timetable_slots;
CREATE POLICY "Anyone can view timetable slots"
ON public.course_timetable_slots
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage timetable slots" ON public.course_timetable_slots;
CREATE POLICY "Admins can manage timetable slots"
ON public.course_timetable_slots
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Reps can manage slots for courses in their own department
DROP POLICY IF EXISTS "Reps can manage timetable slots in their department" ON public.course_timetable_slots;
CREATE POLICY "Reps can manage timetable slots in their department"
ON public.course_timetable_slots
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.courses c ON c.id = course_timetable_slots.course_id
    WHERE p.id = auth.uid()
      AND p.department_id = c.department_id
  )
);

DROP POLICY IF EXISTS "Reps can update timetable slots in their department" ON public.course_timetable_slots;
CREATE POLICY "Reps can update timetable slots in their department"
ON public.course_timetable_slots
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.courses c ON c.id = course_timetable_slots.course_id
    WHERE p.id = auth.uid()
      AND p.department_id = c.department_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.courses c ON c.id = course_timetable_slots.course_id
    WHERE p.id = auth.uid()
      AND p.department_id = c.department_id
  )
);

DROP POLICY IF EXISTS "Reps can delete timetable slots in their department" ON public.course_timetable_slots;
CREATE POLICY "Reps can delete timetable slots in their department"
ON public.course_timetable_slots
FOR DELETE
USING (
  public.has_role(auth.uid(), 'rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.courses c ON c.id = course_timetable_slots.course_id
    WHERE p.id = auth.uid()
      AND p.department_id = c.department_id
  )
);

-- 5) RLS: allow reps to UPDATE course fields for their department (name/code/credit_units)
-- (RLS can't restrict columns; frontend will only expose these fields)
DROP POLICY IF EXISTS "Reps can update courses in their department" ON public.courses;
CREATE POLICY "Reps can update courses in their department"
ON public.courses
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.department_id = public.courses.department_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'rep'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.department_id = public.courses.department_id
  )
);

-- 6) Performance: view to fetch courses with lecture note counts in one query
CREATE OR REPLACE VIEW public.courses_with_note_counts AS
SELECT
  c.id,
  c.department_id,
  c.level,
  c.created_at,
  c.code,
  c.name,
  c.credit_units,
  COALESCE(COUNT(ln.id), 0)::integer AS note_count
FROM public.courses c
LEFT JOIN public.lecture_notes ln
  ON ln.course_id = c.id
GROUP BY c.id;
