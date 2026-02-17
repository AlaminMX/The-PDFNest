-- Add new profile columns for Phase 4 (Profile rebuild) and Phase 1 (Signup flow)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS discovery_source text,
  ADD COLUMN IF NOT EXISTS is_student boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_theme text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS financial_literacy_interest boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_reason text,
  ADD COLUMN IF NOT EXISTS age integer;