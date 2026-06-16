-- Allow admins to upload PDF files for standalone department Books/Journals.
DROP POLICY IF EXISTS "Admins can upload standalone school PDFs" ON storage.objects;
CREATE POLICY "Admins can upload standalone school PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school_pdfs'
  AND (storage.foldername(name))[1] = 'standalone'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to maintain generated standalone thumbnails regardless of folder owner.
DROP POLICY IF EXISTS "Admins can manage standalone thumbnails" ON storage.objects;
CREATE POLICY "Admins can manage standalone thumbnails"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'pdf-thumbnails'
  AND (storage.foldername(name))[2] = 'standalone-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'pdf-thumbnails'
  AND (storage.foldername(name))[2] = 'standalone-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
