-- ============================================================
-- Make ALL academic content readable by everyone (anon + authenticated).
-- PDFNest is a public academic library — no login needed to browse.
-- Run this migration once and the faculty grid + all browse pages
-- will work for guests immediately.
-- ============================================================

-- FACULTIES
DROP POLICY IF EXISTS "Anyone can view faculties" ON public.faculties;
CREATE POLICY "Anyone can view faculties"
  ON public.faculties FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- DEPARTMENTS
DROP POLICY IF EXISTS "Anon can view visible departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments"
  ON public.departments FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- COURSES
DROP POLICY IF EXISTS "Anon can view courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (true);

-- LECTURE NOTES
DROP POLICY IF EXISTS "Anonymous users can view lecture notes" ON public.lecture_notes;
DROP POLICY IF EXISTS "Authenticated users can view lecture notes" ON public.lecture_notes;
DROP POLICY IF EXISTS "Anyone can view lecture notes" ON public.lecture_notes;
CREATE POLICY "Anyone can view lecture notes"
  ON public.lecture_notes FOR SELECT
  TO anon, authenticated
  USING (true);

-- STORAGE: school_pdfs bucket (for PDF viewing via signed URLs)
DROP POLICY IF EXISTS "Anyone can read school_pdfs for viewing" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view school PDFs" ON storage.objects;
CREATE POLICY "Anyone can view school PDFs"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'school_pdfs');

-- DEPARTMENT CATEGORIES
DROP POLICY IF EXISTS "Anyone can view categories" ON public.department_categories;
CREATE POLICY "Anyone can view categories"
  ON public.department_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- COURSE TIMETABLE SLOTS
DROP POLICY IF EXISTS "Anyone can view timetable slots" ON public.course_timetable_slots;
CREATE POLICY "Anyone can view timetable slots"
  ON public.course_timetable_slots FOR SELECT
  TO anon, authenticated
  USING (true);

-- APP SETTINGS (for theme etc)
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (true);
