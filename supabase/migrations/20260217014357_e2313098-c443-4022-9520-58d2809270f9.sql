
-- 1. Add semester column to courses table
ALTER TABLE public.courses 
ADD COLUMN semester text NOT NULL DEFAULT 'first';

-- 2. Add constraint for valid values
ALTER TABLE public.courses 
ADD CONSTRAINT courses_semester_check CHECK (semester IN ('first', 'second'));

-- 3. All existing courses default to 'first' semester (already handled by DEFAULT)

-- 4. Recreate the view to include semester
DROP VIEW IF EXISTS public.courses_with_note_counts;
CREATE VIEW public.courses_with_note_counts AS
SELECT c.id,
    c.department_id,
    c.level,
    c.semester,
    c.created_at,
    c.code,
    c.name,
    c.credit_units,
    (COALESCE(count(ln.id), (0)::bigint))::integer AS note_count
FROM courses c
LEFT JOIN lecture_notes ln ON ln.course_id = c.id
GROUP BY c.id;
