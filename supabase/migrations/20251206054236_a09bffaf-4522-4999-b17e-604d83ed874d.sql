-- First drop the old policy explicitly
DROP POLICY "Reps can upload to their department folder" ON storage.objects;

-- Now create the CORRECT policy
-- IMPORTANT: (storage.foldername(name))[1] extracts the first folder from the uploaded file's path
-- We compare it to d.name which is the department name
CREATE POLICY "Reps can upload school pdfs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'school_pdfs'
  AND has_role(auth.uid(), 'rep')
  AND (
    SELECT d.name 
    FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
  ) = (storage.foldername(name))[1]
);