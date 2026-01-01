-- Add display_order column to departments for manual ordering
ALTER TABLE public.departments 
ADD COLUMN display_order integer;

-- Initialize display_order based on creation time (existing departments get sequential order)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.departments
)
UPDATE public.departments d
SET display_order = o.rn
FROM ordered o
WHERE d.id = o.id;