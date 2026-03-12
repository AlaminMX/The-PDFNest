
-- 1. Create app_settings table for admin-controlled feature flags
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can insert settings
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed Ramadan toggle
INSERT INTO public.app_settings (key, value) VALUES ('ramadan_theme_enabled', 'false');

-- 2. Create faculties table
CREATE TABLE public.faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  color text,
  display_order integer DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view faculties"
  ON public.faculties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage faculties"
  ON public.faculties FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Add faculty_id to departments
ALTER TABLE public.departments ADD COLUMN faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL;

-- Auto-update updated_at on app_settings
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
