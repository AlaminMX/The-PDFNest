
-- Drop legacy waitlist
DROP TABLE IF EXISTS public.store_waitlist CASCADE;

-- Final Year Projects (FYP Hub)
CREATE TABLE public.final_year_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  author_name TEXT NOT NULL,
  supervisor_name TEXT,
  year INTEGER,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fyp_status_check CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX idx_fyp_status ON public.final_year_projects(status);
CREATE INDEX idx_fyp_faculty ON public.final_year_projects(faculty_id);
CREATE INDEX idx_fyp_user ON public.final_year_projects(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.final_year_projects TO authenticated;
GRANT SELECT ON public.final_year_projects TO anon;
GRANT ALL ON public.final_year_projects TO service_role;

ALTER TABLE public.final_year_projects ENABLE ROW LEVEL SECURITY;

-- Force status='pending' on insert from non-admins
CREATE OR REPLACE FUNCTION public.enforce_fyp_pending()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.review_note := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fyp_pending
BEFORE INSERT ON public.final_year_projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_fyp_pending();

CREATE TRIGGER trg_fyp_updated_at
BEFORE UPDATE ON public.final_year_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies
CREATE POLICY "Approved projects are public"
ON public.final_year_projects FOR SELECT
USING (status = 'approved');

CREATE POLICY "Owners view own projects"
ON public.final_year_projects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all projects"
ON public.final_year_projects FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can submit projects"
ON public.final_year_projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own pending projects"
ON public.final_year_projects FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update any project"
ON public.final_year_projects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can delete own pending projects"
ON public.final_year_projects FOR DELETE TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can delete any project"
ON public.final_year_projects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.final_year_projects;

-- Storage policies for project-files bucket (bucket itself created separately)
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can read their project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can read all project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can read approved project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.final_year_projects fyp
    WHERE fyp.file_path = storage.objects.name
      AND fyp.status = 'approved'
  )
);

CREATE POLICY "Owners can delete their project files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
