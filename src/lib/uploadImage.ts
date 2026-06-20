import { supabase } from "@/integrations/supabase/client";
import { TILE_UPLOAD_BUCKET, TILE_UPLOAD_FOLDER } from "@/lib/tileUploadStorage";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

// Supabase Storage normalizes `image/jpg` to `image/jpeg`. Send the
// canonical value to avoid "MIME type ... is not supported" rejections.
export function normalizeImageMime(mime: string): AllowedImageMime | null {
  const m = mime?.toLowerCase().trim();
  if (m === "image/jpg") return "image/jpeg";
  if (m === "image/jpeg" || m === "image/png" || m === "image/webp") return m;
  return null;
}

export function extensionForMime(mime: AllowedImageMime): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export interface UploadTileImageArgs {
  kind: "faculty" | "department";
  blob: Blob;
  mime: string;
}

export interface UploadTileImageResult {
  publicUrl: string;
  path: string;
}

/**
 * Uploads a tile background image into the configured public storage bucket
 * and returns its public URL. Validates and normalizes MIME types so that
 * `image/jpg` and similar variants don't get rejected by Storage.
 */
export async function uploadTileImage({ kind, blob, mime }: UploadTileImageArgs): Promise<UploadTileImageResult> {
  const normalized = normalizeImageMime(mime);
  if (!normalized) {
    throw new Error(`Unsupported image type "${mime}". Use JPG, JPEG, PNG, or WebP.`);
  }

  const path = `${TILE_UPLOAD_FOLDER}/${kind}/${crypto.randomUUID()}.${extensionForMime(normalized)}`;

  const { error: upErr } = await supabase.storage
    .from(TILE_UPLOAD_BUCKET)
    .upload(path, blob, { contentType: normalized, upsert: true });

  if (upErr) {
    console.error("Tile image upload failed", { bucket: TILE_UPLOAD_BUCKET, path, contentType: normalized, error: upErr });
    throw upErr;
  }

  const { data } = supabase.storage.from(TILE_UPLOAD_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}
