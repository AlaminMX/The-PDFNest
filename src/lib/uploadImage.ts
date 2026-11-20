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

export async function uploadTileImage({ kind, blob }: {
  kind: "faculty" | "department";
  blob: Blob;
}): Promise<{ publicUrl: string; path: string }> {
  if (blob.type !== "image/webp" || blob.size === 0) {
    throw new Error("A compressed WebP image is required.");
  }
  const path = `${TILE_UPLOAD_FOLDER}/${kind}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(TILE_UPLOAD_BUCKET)
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;

  return { publicUrl: `/media/${path}`, path };
}
