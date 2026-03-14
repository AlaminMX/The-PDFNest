-- Allow anonymous (unauthenticated) users to read from the school_pdfs bucket.
-- This enables signed URL generation for guest users so they can VIEW
-- lecture notes without logging in.
-- Download is blocked at the UI layer (requireAuth). This policy only
-- enables the createSignedUrl call to succeed for anon clients.

CREATE POLICY "Anyone can read school_pdfs for viewing"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'school_pdfs');
