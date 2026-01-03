-- Add visibility column to departments
ALTER TABLE public.departments 
ADD COLUMN is_visible boolean NOT NULL DEFAULT true;

-- Create admin_banners table
CREATE TABLE public.admin_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  banner_type text NOT NULL CHECK (banner_type IN ('inline', 'popup')),
  link_url text,
  link_text text,
  gradient_from text DEFAULT 'blue-600',
  gradient_to text DEFAULT 'indigo-600',
  is_active boolean DEFAULT true,
  show_profile_dot boolean DEFAULT false,
  show_on_profile boolean DEFAULT false,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_banners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active banners
CREATE POLICY "Anyone can view active banners" ON public.admin_banners
  FOR SELECT USING (is_active = true);

-- Admins can manage all banners
CREATE POLICY "Admins can manage banners" ON public.admin_banners
  FOR ALL USING (has_role(auth.uid(), 'admin'));