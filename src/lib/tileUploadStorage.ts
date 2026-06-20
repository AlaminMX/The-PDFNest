import { supabase } from "@/integrations/supabase/client";

export const TILE_UPLOAD_BUCKET = "school_pdfs";
export const REQUIRED_TILE_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

type TileUploadBucketConfig = {
  bucket_id: string;
  bucket_exists: boolean;
  allowed_mime_types: string[] | null;
  missing_mime_types: string[] | null;
};

export async function verifyTileUploadBucketConfig() {
  const { data, error } = await supabase.rpc("get_tile_upload_bucket_config");

  if (error) {
    console.error("Tile upload bucket configuration check failed", error);
    return null;
  }

  const config = Array.isArray(data) ? (data[0] as TileUploadBucketConfig | undefined) : null;

  console.info("Tile upload bucket configuration", {
    bucket: TILE_UPLOAD_BUCKET,
    allowedMimeTypes: config?.allowed_mime_types ?? null,
    missingMimeTypes: config?.missing_mime_types ?? null,
    bucketExists: config?.bucket_exists ?? false,
  });

  if (!config?.bucket_exists) {
    throw new Error(`Storage bucket "${TILE_UPLOAD_BUCKET}" is missing. Please run the latest Supabase migrations.`);
  }

  const missingMimeTypes = config.missing_mime_types || [];
  if (missingMimeTypes.length > 0) {
    throw new Error(
      `Storage bucket "${TILE_UPLOAD_BUCKET}" is missing required image MIME types: ${missingMimeTypes.join(", ")}. Please run the latest Supabase migrations.`,
    );
  }

  return config;
}
