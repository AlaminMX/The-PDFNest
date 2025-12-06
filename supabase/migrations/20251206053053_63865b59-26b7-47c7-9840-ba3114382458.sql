-- Drop the incorrect policy
DROP POLICY IF EXISTS "Reps can upload to their department folder" ON storage.objects;

-- Create corrected policy that checks the uploaded file path against rep's department
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