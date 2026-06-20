import { supabase } from "@/integrations/supabase/client";

// We reuse the public `avatars` bucket for tile background images because the
// workspace policy blocks creating new public buckets. Files live under the
// `tile-assets/<kind>/...` prefix and are gated by admin-only RLS policies on
// storage.objects (see migration 2026-06-20).
export const TILE_UPLOAD_BUCKET = "avatars";
export const TILE_UPLOAD_FOLDER = "tile-assets";

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
  if (!config?.bucket_exists) {
    throw new Error(`Storage bucket "${TILE_UPLOAD_BUCKET}" is missing.`);
  }
  return config;
}
