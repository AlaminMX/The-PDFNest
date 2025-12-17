-- Drop the overly permissive policy that exposes all profile fields for reps
DROP POLICY IF EXISTS "Anyone can view rep profiles" ON public.profiles;