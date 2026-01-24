-- Fix linter: make views use invoker privileges (avoid SECURITY DEFINER behavior)
ALTER VIEW public.public_rep_profiles SET (security_invoker = true);
ALTER VIEW public.courses_with_note_counts SET (security_invoker = true);

-- Fix linter: set immutable search_path for trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;