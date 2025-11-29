-- Course Rep System: Part 1 - Add 'rep' role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rep';