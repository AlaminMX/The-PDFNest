-- Create school_pdfs storage bucket for lecture notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('school_pdfs', 'school_pdfs', true)
ON CONFLICT (id) DO NOTHING;