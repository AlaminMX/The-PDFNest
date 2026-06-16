
-- 1. standalone_documents table for books/journals
CREATE TABLE IF NOT EXISTS public.standalone_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('book','journal')),
  title text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  thumbnail_path text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.standalone_documents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.standalone_documents TO authenticated;
GRANT ALL ON public.standalone_documents TO service_role;

ALTER TABLE public.standalone_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view standalone documents"
  ON public.standalone_documents FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert standalone documents"
  ON public.standalone_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update standalone documents"
  ON public.standalone_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete standalone documents"
  ON public.standalone_documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_standalone_documents_updated_at
  BEFORE UPDATE ON public.standalone_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_standalone_documents_dept_cat
  ON public.standalone_documents(department_id, category, created_at DESC);

-- 2. Add background_image_url to faculties and departments
ALTER TABLE public.faculties ADD COLUMN IF NOT EXISTS background_image_url text;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS background_image_url text;

-- 3. Storage policy: allow admins to write tile-assets/* in school_pdfs bucket
CREATE POLICY "Admins can upload tile assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'school_pdfs'
    AND (storage.foldername(name))[1] = 'tile-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can update tile assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'school_pdfs'
    AND (storage.foldername(name))[1] = 'tile-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can delete tile assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'school_pdfs'
    AND (storage.foldername(name))[1] = 'tile-assets'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
