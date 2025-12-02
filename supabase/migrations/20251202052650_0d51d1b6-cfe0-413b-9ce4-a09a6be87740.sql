-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policy: Users can manage their own avatar  
CREATE POLICY "Users can manage own avatar" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policy: Anyone can view avatars (public)
CREATE POLICY "Avatars are public" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');