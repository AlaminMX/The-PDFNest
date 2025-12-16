-- Fix 1: Secure update_user_storage against cross-user abuse
CREATE OR REPLACE FUNCTION public.update_user_storage(p_user_id uuid, p_size_delta bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication context
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only allow updating own storage, unless admin
  IF auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: can only update own storage';
  END IF;

  UPDATE public.profiles
  SET total_storage_used = GREATEST(0, COALESCE(total_storage_used, 0) + p_size_delta)
  WHERE id = p_user_id;
END;
$$;

-- Fix 2: Allow admins to manage roles (delete/insert) while keeping non-admins blocked
-- Existing policies were created as RESTRICTIVE and block admins too.
DROP POLICY IF EXISTS "No user INSERT on roles" ON public.user_roles;
DROP POLICY IF EXISTS "No user UPDATE on roles" ON public.user_roles;
DROP POLICY IF EXISTS "No user DELETE on roles" ON public.user_roles;

-- Admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- No UPDATE policy: default-deny prevents role modifications (roles must be added/removed only)
