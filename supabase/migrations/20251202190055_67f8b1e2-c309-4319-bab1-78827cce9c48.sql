-- Drop the buggy policy
DROP POLICY IF EXISTS "Reps can upload to their department folder" ON storage.objects;

-- Create corrected policy that properly matches department name in path
CREATE POLICY "Reps can upload to their department folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'school_pdfs' 
  AND has_role(auth.uid(), 'rep'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid() 
    AND (storage.foldername(name))[1] = d.name
  )
);