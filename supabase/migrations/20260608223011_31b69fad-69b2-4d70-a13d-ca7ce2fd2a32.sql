ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Backfill: anyone who already exists should not be forced through onboarding
UPDATE public.profiles SET onboarding_complete = true WHERE onboarding_complete = false;

CREATE INDEX IF NOT EXISTS idx_profiles_faculty ON public.profiles(faculty_id);