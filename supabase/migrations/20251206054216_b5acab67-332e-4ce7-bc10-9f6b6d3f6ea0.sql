-- Drop the broken policy completely
DROP POLICY IF EXISTS "Reps can upload to their department folder" ON storage.objects;

-- Create a corrected policy that properly checks the uploaded file's path
-- The file path format is: {department_name}/{course_code}/lecture_notes/{filename}.pdf
-- So (storage.foldername(name))[1] gives the department name from the uploaded file path
CREATE POLICY "Reps can upload to their department folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'school_pdfs'
  AND has_role(auth.uid(), 'rep')
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (storage.foldername(name))[1] = d.name
  )
);