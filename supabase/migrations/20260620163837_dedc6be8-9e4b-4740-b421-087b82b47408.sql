-- Admin write access to tile-assets/* inside the public avatars bucket
CREATE POLICY "Admins can upload tile assets to avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'tile-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update tile assets in avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'tile-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete tile assets in avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'tile-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Refresh the helper used by TileImageUpload to verify bucket health
CREATE OR REPLACE FUNCTION public.get_tile_upload_bucket_config()
RETURNS TABLE(bucket_id text, bucket_exists boolean, allowed_mime_types text[], missing_mime_types text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'avatars'::text AS bucket_id,
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') AS bucket_exists,
    (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'avatars') AS allowed_mime_types,
    ARRAY[]::text[] AS missing_mime_types;
$$;

GRANT EXECUTE ON FUNCTION public.get_tile_upload_bucket_config() TO anon, authenticated;