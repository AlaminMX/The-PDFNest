-- Add is_favorite column to pdf_files table
ALTER TABLE public.pdf_files 
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster favorite queries
CREATE INDEX idx_pdf_files_is_favorite ON public.pdf_files(user_id, is_favorite) WHERE is_favorite = true;