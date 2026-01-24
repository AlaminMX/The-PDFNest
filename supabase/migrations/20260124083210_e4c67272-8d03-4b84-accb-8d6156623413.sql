-- Add department_categories table
CREATE TABLE IF NOT EXISTS public.department_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add category_id to departments
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.department_categories(id) ON DELETE SET NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_departments_category_id ON public.departments(category_id);

-- RLS for department_categories (read-only for all, admin-managed)
ALTER TABLE public.department_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
ON public.department_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.department_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user_notifications table for in-app inbox
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'new_lecture_note' | 'timetable_update'
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_dept ON public.user_notifications(department_id);

-- RLS for user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true); -- Edge functions use service role

-- Create optimized view for profile page data (single query for user info + stats)
CREATE OR REPLACE VIEW public.user_profile_summary AS
SELECT 
  p.id,
  p.display_name,
  p.full_name,
  p.email,
  p.avatar_url,
  p.total_storage_used,
  p.created_at,
  p.department_id,
  d.name as department_name,
  (SELECT COUNT(*) FROM public.pdf_files WHERE user_id = p.id) as pdf_count,
  (SELECT COUNT(*) FROM public.user_notifications WHERE user_id = p.id AND is_read = false) as unread_notification_count
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id;

-- RLS for the view (inherits from profiles)
-- Views use the RLS of underlying tables, so no separate policy needed