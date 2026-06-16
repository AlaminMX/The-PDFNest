CREATE TABLE IF NOT EXISTS public.standalone_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('book', 'journal')),
  title text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  thumbnail_path text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standalone_documents_department_category
  ON public.standalone_documents (department_id, category, created_at DESC);

ALTER TABLE public.standalone_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view standalone documents" ON public.standalone_documents;
CREATE POLICY "Anyone can view standalone documents"
  ON public.standalone_documents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage standalone documents" ON public.standalone_documents;
CREATE POLICY "Admins can manage standalone documents"
  ON public.standalone_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
