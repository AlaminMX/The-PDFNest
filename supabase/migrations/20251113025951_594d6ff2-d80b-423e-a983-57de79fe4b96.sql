-- Add storage policies to allow admins to access all PDF files
CREATE POLICY "Admins can view all PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdfs' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete all PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdfs' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);