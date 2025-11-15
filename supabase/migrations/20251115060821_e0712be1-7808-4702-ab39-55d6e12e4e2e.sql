-- Add preference columns to profiles table for user settings
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_sort_order text DEFAULT 'date-desc',
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_default_category ON profiles(default_category_id);