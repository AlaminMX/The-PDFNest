-- Fix school_pdfs storage bucket policies
-- Add SELECT policy for anyone to download lecture notes
CREATE POLICY "Anyone can view school PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'school_pdfs');

-- Add DELETE policy for reps to delete their own uploads and admins to delete any
CREATE POLICY "Reps and admins can delete school PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'school_pdfs' AND
  (has_role(auth.uid(), 'rep') OR has_role(auth.uid(), 'admin'))
);

-- Add UPDATE policy for reps and admins
CREATE POLICY "Reps and admins can update school PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'school_pdfs' AND
  (has_role(auth.uid(), 'rep') OR has_role(auth.uid(), 'admin'))
);