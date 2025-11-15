-- Create storage bucket for PDF thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-thumbnails', 'pdf-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Add thumbnail_url column to pdf_files table
ALTER TABLE pdf_files 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create RLS policies for thumbnail bucket
CREATE POLICY "Users can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-thumbnails');

CREATE POLICY "Users can upload their own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pdf-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdf-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);