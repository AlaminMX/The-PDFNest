-- Fix 1: Update storage policies for school_pdfs bucket to restrict DELETE/UPDATE to file owners
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Reps and admins can delete school PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Reps and admins can update school PDFs" ON storage.objects;

-- Create new DELETE policy: Reps can only delete their own uploads, admins can delete any
CREATE POLICY "Reps can delete own uploads, admins can delete any"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'school_pdfs' AND
  (
    -- Admin can delete any
    has_role(auth.uid(), 'admin') OR
    -- Rep can only delete files they uploaded (join with lecture_notes to verify ownership)
    (has_role(auth.uid(), 'rep') AND 
     EXISTS (
       SELECT 1 FROM public.lecture_notes ln
       WHERE ln.file_path = name AND ln.uploaded_by = auth.uid()
     ))
  )
);

-- Create new UPDATE policy: Reps can only update their own uploads, admins can update any
CREATE POLICY "Reps can update own uploads, admins can update any"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'school_pdfs' AND
  (
    -- Admin can update any
    has_role(auth.uid(), 'admin') OR
    -- Rep can only update files they uploaded
    (has_role(auth.uid(), 'rep') AND 
     EXISTS (
       SELECT 1 FROM public.lecture_notes ln
       WHERE ln.file_path = name AND ln.uploaded_by = auth.uid()
     ))
  )
);

-- Fix 2: Enhance has_role function with authentication validation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authenticated user for security
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has the specified role
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;