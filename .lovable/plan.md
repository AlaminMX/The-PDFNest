## Root cause

`TileImageUpload` uploads to the `school_pdfs` bucket (see `src/lib/tileUploadStorage.ts`: `TILE_UPLOAD_BUCKET = "school_pdfs"`). Confirmed via DB query:

```
school_pdfs → allowed_mime_types = ['application/pdf']
```

Supabase Storage rejects every image upload with "MIME type image/... is not supported" because the bucket is locked to PDFs only. Previous fix attempts added an RPC verification + new migration intended to widen the MIME list, but the bucket in the live database still only allows `application/pdf` — so the migration either never ran or was reverted. Mixing tile background images into the same bucket that holds academic PDFs is also a long-term smell (different size limits, different RLS expectations, public/private semantics).

## Fix

1. **Create a dedicated public bucket `tile-images`** via `supabase--storage_create_bucket` (public, since tile backgrounds render on unauthenticated landing/faculty pages).
2. **Migration** to:
   - Set `tile-images.allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']` and `file_size_limit = 5 MB`.
   - Add `storage.objects` RLS policies: public `SELECT`, admin-only `INSERT/UPDATE/DELETE` (uses existing `has_role(auth.uid(),'admin')`).
3. **Point `src/lib/tileUploadStorage.ts`** at the new bucket (`TILE_UPLOAD_BUCKET = "tile-images"`). Keep the `verifyTileUploadBucketConfig` RPC but update its expected bucket name; this surfaces a clear error if the bucket ever drifts again.
4. **Centralize image upload + validation** in `src/lib/uploadImage.ts`:
   ```ts
   export const ALLOWED_IMAGE_TYPES = ["image/jpeg","image/jpg","image/png","image/webp"] as const;
   export async function uploadTileImage(file: Blob, contentType: string, path: string)
   ```
   - Normalizes `image/jpg` → `image/jpeg` before sending to Storage (Supabase's MIME check rejects `image/jpg`).
   - Passes explicit `contentType` and `upsert: true`.
5. **Refactor `TileImageUpload.tsx`** to call the new utility for both initial uploads and edited/recropped uploads. Remove duplicate MIME logic. Keep the canvas re-encode pipeline (which always outputs `image/jpeg`, `image/png`, or `image/webp` — never `image/jpg`).
6. **Leave `school_pdfs` untouched** so the existing PDF flow keeps its strict whitelist.

## Verification

- Drive the admin Faculties page via Playwright headless against `localhost:8080`:
  - Restore Supabase session from sandbox env.
  - For each format (jpg, jpeg, png, webp): generate a tiny test image in Python (PIL), open the faculty edit dialog, upload, click Save, assert the toast is "Image uploaded" and the returned public URL renders (HTTP 200 with matching `content-type`).
  - Repeat on the Departments admin page.
- Capture screenshots after each upload to confirm the tile preview shows the new background.
- Refresh the page and re-assert the tile image still renders (URL persisted in `faculties.background_image_url` / `departments.background_image_url`).

## Files touched

- `supabase/migrations/<new>_tile_images_bucket.sql` (new)
- `src/lib/tileUploadStorage.ts` (bucket name + expected MIME list)
- `src/lib/uploadImage.ts` (new centralized utility)
- `src/components/TileImageUpload.tsx` (use utility, normalize jpg→jpeg)
- New bucket `tile-images` via `supabase--storage_create_bucket`

## Out of scope

- No change to existing `school_pdfs` policies or contents.
- No change to PDF upload flows, RLS for academic content, or unrelated admin pages.
