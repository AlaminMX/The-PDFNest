-- Harden the school_pdfs bucket for faculty/department tile background uploads.
-- Keep existing PDF support while explicitly allowing edited image output MIME types.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'school_pdfs',
  'school_pdfs',
  true,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = (
  SELECT array_agg(DISTINCT mime_type ORDER BY mime_type)
  FROM unnest(
    COALESCE(storage.buckets.allowed_mime_types, ARRAY[]::text[])
    || ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
  ) AS mime_type
);

CREATE OR REPLACE FUNCTION public.get_tile_upload_bucket_config()
RETURNS TABLE (
  bucket_id text,
  bucket_exists boolean,
  allowed_mime_types text[],
  missing_mime_types text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  WITH required_mime_types AS (
    SELECT ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[] AS mime_types
  ), bucket AS (
    SELECT b.id, b.allowed_mime_types
    FROM storage.buckets b
    WHERE b.id = 'school_pdfs'
  )
  SELECT
    'school_pdfs'::text AS bucket_id,
    EXISTS (SELECT 1 FROM bucket) AS bucket_exists,
    (SELECT bucket.allowed_mime_types FROM bucket) AS allowed_mime_types,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM bucket) THEN (SELECT mime_types FROM required_mime_types)
      WHEN (SELECT bucket.allowed_mime_types FROM bucket) IS NULL THEN ARRAY[]::text[]
      ELSE ARRAY(
        SELECT required_mime
        FROM unnest((SELECT mime_types FROM required_mime_types)) AS required_mime
        WHERE NOT (required_mime = ANY((SELECT bucket.allowed_mime_types FROM bucket)))
      )
    END AS missing_mime_types;
$$;

GRANT EXECUTE ON FUNCTION public.get_tile_upload_bucket_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tile_upload_bucket_config() TO anon;
NOTIFY pgrst, 'reload schema';
