-- Ensure tile background uploads are accepted by Supabase Storage when the
-- school_pdfs bucket has an allowed MIME type list configured.
UPDATE storage.buckets
SET allowed_mime_types = CASE
  WHEN allowed_mime_types IS NULL THEN NULL
  ELSE (
    SELECT array_agg(DISTINCT mime_type ORDER BY mime_type)
    FROM unnest(
      allowed_mime_types || ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
      ]::text[]
    ) AS mime_type
  )
END
WHERE id = 'school_pdfs';
