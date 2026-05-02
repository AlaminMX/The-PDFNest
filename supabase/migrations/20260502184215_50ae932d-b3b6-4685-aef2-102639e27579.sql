-- Fix community upload storage INSERT policy to enforce path ownership
DROP POLICY IF EXISTS "Users can upload community materials" ON storage.objects;

CREATE POLICY "Users can upload community materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'school_pdfs'
  AND (storage.foldername(name))[1] = 'community'
  AND (storage.foldername(name))[2] = auth.uid()::text
);