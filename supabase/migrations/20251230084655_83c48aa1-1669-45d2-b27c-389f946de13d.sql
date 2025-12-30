-- Add visual identity columns to departments
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.departments.color IS 'Department brand color (e.g., "emerald", "blue", "#3B82F6")';
COMMENT ON COLUMN public.departments.icon IS 'Department emoji icon (e.g., "💻", "🔒")';