-- Remove file size limit from school_pdfs bucket to allow reps to upload large files
UPDATE storage.buckets 
SET file_size_limit = NULL 
WHERE id = 'school_pdfs';