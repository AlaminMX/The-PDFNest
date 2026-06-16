-- Admin-controlled label for the standalone departments separator.
INSERT INTO public.app_settings (key, value)
VALUES
  ('new_departments_label_enabled', 'true'),
  ('new_departments_label', 'New Departments')
ON CONFLICT (key) DO NOTHING;
