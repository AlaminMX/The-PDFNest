-- Allow course reps to fully manage approved courses in their own department.
-- Existing policies already let reps suggest pending courses and admins manage everything.

-- INSERT: Reps can create approved courses for their assigned department
CREATE POLICY "Reps can create courses in their department"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'rep'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.department_id = courses.department_id
  )
);

-- DELETE: Reps can delete courses in their own department
CREATE POLICY "Reps can delete courses in their department"
ON public.courses
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'rep'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.department_id = courses.department_id
  )
);