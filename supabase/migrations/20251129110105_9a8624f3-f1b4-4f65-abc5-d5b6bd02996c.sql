-- Course Rep System: Part 2 - Tables, Indexes, Policies, and Seed Data

-- Step 1: Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, code)
);

-- Step 3: Extend profiles table with Course Rep fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_insider BOOLEAN DEFAULT false;

-- Step 4: Create lecture_notes table
CREATE TABLE IF NOT EXISTS public.lecture_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by_display TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_lecture_notes_course ON public.lecture_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_lecture_notes_uploaded_by ON public.lecture_notes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);

-- Step 6: Enable RLS on new tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_notes ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for departments (public read)
CREATE POLICY "Anyone can view departments"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 8: RLS Policies for courses (public read)
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 9: RLS Policies for lecture_notes
CREATE POLICY "Anyone can view lecture notes"
  ON public.lecture_notes FOR SELECT
  USING (true);

CREATE POLICY "Reps can insert lecture notes to their department only"
  ON public.lecture_notes FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'rep') AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.courses c ON c.id = lecture_notes.course_id
      WHERE p.id = auth.uid() 
        AND p.department_id = c.department_id
    )
  );

CREATE POLICY "Reps can update their own lecture notes"
  ON public.lecture_notes FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Reps can delete their own lecture notes"
  ON public.lecture_notes FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all lecture notes"
  ON public.lecture_notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 10: Seed data for departments
INSERT INTO public.departments (name, slug) VALUES
  ('Computer Science', 'computer-science'),
  ('Cyber Security', 'cyber-security')
ON CONFLICT (slug) DO NOTHING;

-- Step 11: Seed data for 100L courses (Computer Science)
INSERT INTO public.courses (department_id, code, name, level) 
SELECT 
  d.id,
  c.code,
  c.name,
  100
FROM public.departments d
CROSS JOIN (
  VALUES 
    ('CSC101', 'Introduction to Computer Science'),
    ('CSC102', 'Introduction to Problem Solving'),
    ('MTH101', 'Elementary Mathematics I'),
    ('MTH102', 'Elementary Mathematics II'),
    ('PHY101', 'General Physics I'),
    ('PHY102', 'General Physics II'),
    ('GST101', 'Use of English and Communication Skills I'),
    ('GST102', 'Use of English and Communication Skills II')
) AS c(code, name)
WHERE d.slug = 'computer-science'
ON CONFLICT (department_id, code) DO NOTHING;

-- Step 12: Seed data for 100L courses (Cyber Security)
INSERT INTO public.courses (department_id, code, name, level) 
SELECT 
  d.id,
  c.code,
  c.name,
  100
FROM public.departments d
CROSS JOIN (
  VALUES 
    ('CYB101', 'Introduction to Cyber Security'),
    ('CYB102', 'Fundamentals of Information Security'),
    ('CSC101', 'Introduction to Computer Science'),
    ('MTH101', 'Elementary Mathematics I'),
    ('MTH102', 'Elementary Mathematics II'),
    ('PHY101', 'General Physics I'),
    ('GST101', 'Use of English and Communication Skills I'),
    ('GST102', 'Use of English and Communication Skills II')
) AS c(code, name)
WHERE d.slug = 'cyber-security'
ON CONFLICT (department_id, code) DO NOTHING;

-- Step 13: Create storage bucket for lecture notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school_pdfs',
  'school_pdfs',
  true,
  26214400, -- 25MB in bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Step 14: Storage RLS policies for school_pdfs bucket
CREATE POLICY "Anyone can view lecture note files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school_pdfs');

CREATE POLICY "Reps can upload to their department folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'school_pdfs' AND
    public.has_role(auth.uid(), 'rep') AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.id = auth.uid() 
        AND (storage.foldername(name))[1] = d.slug
    )
  );

CREATE POLICY "Reps can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'school_pdfs' AND
    owner = auth.uid()
  );

CREATE POLICY "Admins can manage all school files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'school_pdfs' AND
    public.has_role(auth.uid(), 'admin')
  );