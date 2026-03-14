-- Allow unauthenticated (guest) users to read visible faculties.
-- This is needed for the landing page faculty grid to work without login.
-- The original policy only allowed `authenticated` role.

DROP POLICY IF EXISTS "Anyone can view faculties" ON public.faculties;

CREATE POLICY "Anyone can view faculties"
  ON public.faculties
  FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- Same fix for departments (needed for faculty dept counts on landing page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'departments'
      AND policyname = 'Anon can view visible departments'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can view visible departments"
      ON public.departments FOR SELECT TO anon
      USING (is_visible = true)';
  END IF;
END;
$$;
