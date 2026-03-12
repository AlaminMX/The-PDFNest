
-- Create admin_delete_user_account function
-- This deletes all user data then the auth user
CREATE OR REPLACE FUNCTION public.admin_delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Cannot delete yourself
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete child records first
  DELETE FROM public.pdf_conversations WHERE user_id = p_user_id;
  DELETE FROM public.pdf_summaries WHERE user_id = p_user_id;
  DELETE FROM public.study_guides WHERE user_id = p_user_id;
  DELETE FROM public.user_activity_logs WHERE user_id = p_user_id;
  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  DELETE FROM public.user_notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.categories WHERE user_id = p_user_id;
  DELETE FROM public.pdf_files WHERE user_id = p_user_id;
  DELETE FROM public.lecture_notes WHERE uploaded_by = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete the auth user
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
