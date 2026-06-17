
-- 1) Remove tables from realtime publication to prevent broadcast leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.final_year_projects;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_notifications;

-- 2) Remove client INSERT on activity logs; force routing via edge function (service role)
DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity_logs;

-- 3) Restrict public read on school_pdfs bucket so community/ files are only public after approval
DROP POLICY IF EXISTS "Public read access for school_pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read school_pdfs for viewing" ON storage.objects;

CREATE POLICY "Public read school_pdfs (approved community only)"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'school_pdfs'
  AND (
    name NOT LIKE 'community/%'
    OR EXISTS (
      SELECT 1 FROM public.community_uploads cu
      WHERE cu.file_path = storage.objects.name
        AND cu.status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM public.lecture_notes ln
      WHERE ln.file_path = storage.objects.name
    )
    OR EXISTS (
      SELECT 1 FROM public.past_questions pq
      WHERE pq.file_path = storage.objects.name
    )
  )
);
