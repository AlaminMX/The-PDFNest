
-- Fix security definer view - set to INVOKER (default for views, but explicit)
ALTER VIEW public.courses_with_note_counts SET (security_invoker = on);
