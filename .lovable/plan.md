# Standalone Documents — delete, split actions, viewer header fix

Scope is limited to the Books/Journals flow under standalone departments and the shared PDF viewer header. Upload flow, hierarchy, and other pages are untouched.

## 1. Delete documents (admin only)

In `src/pages/StandaloneDocuments.tsx`:

- Add a per-card **Delete** button, rendered only when `isAdmin`.
- On click, open a confirmation dialog (`AlertDialog` from `@/components/ui/alert-dialog`) with copy: *"Are you sure you want to delete this document? This action cannot be undone."*
- On confirm, run in order:
  1. `supabase.storage.from("school_pdfs").remove([file_path, thumbnail_path].filter)` — best-effort, ignore individual file-missing errors.
  2. `supabase.from("standalone_documents").delete().eq("id", doc.id)` — abort on error.
- Track a `deletingId` state to disable the button and show a spinner; prevents duplicate requests.
- On success: optimistically remove the row from `documents`, toast success. On error: toast error, no state change.
- RLS: existing `standalone_documents` admin policy already allows delete; thumbnails bucket policy already allows admin delete. No migration needed.

## 2. Split View and Download actions

Replace the single "Open / View" footer button on each card with three actions in one row:

```
[ View ]   [ Download ]   [ Delete ]   ← Delete admin-only
```

- **View** — keeps current behavior: signed URL → opens `PDFViewer` modal.
- **Download** — fetches signed URL, then fetches the blob and triggers an `<a download={originalFileName}>` click. Shows a per-card loading spinner while preparing; toast on failure. Preserves original filename (store `original_file_name` fallback to `title + ".pdf"` — for now use `${title}.pdf` since the column isn't stored; acceptable per current schema).
- Card thumbnail click continues to open the viewer (View).
- Buttons use `size="sm"`, icon + label on `sm:` and up, icon-only on mobile to avoid clutter. Min 44px tap target via `h-10`.

## 3. PDFViewer header redesign (fixes Close/Download overlap)

In `src/components/PDFViewer.tsx` header bar:

- New layout (sticky, already is via Sheet header):
  - **Left:** filename + size (truncate, `min-w-0 flex-1`).
  - **Right:** action cluster with `gap-3` (12px) on mobile, `gap-4` (16px) on desktop:
    `[Fit width] [Fullscreen] [Open external] [Download] [Delete?] [Close X]`
- Close `X` moves from left to the **far right** of the right cluster, separated from Download by Delete (when shown) or by a `w-px h-6 bg-border mx-1` divider when not shown — eliminates accidental clicks.
- Every action button: `h-10 w-10` (was `h-9 w-9`) for touch targets, `shrink-0`.
- Wrap the right cluster in `flex items-center gap-3 md:gap-4 shrink-0`.
- Add optional props `onDelete?: () => void` and `canDelete?: boolean`. When both set, render a destructive-styled Delete button in the header that calls the parent handler (parent owns the confirm dialog and state refresh).
- Z-index: header already sits above canvas via flex order; no change needed. Confirm via existing fullscreen styling.

`StandaloneDocuments` passes `onDelete`/`canDelete` to `PDFViewer` so admins can also delete from inside the viewer; on success the viewer closes and the list refreshes.

## 4. Verification

After build:
- Upload a PDF as admin → appears in grid.
- Click View → PDFViewer opens, no download triggered.
- Click Download → file saves with `.pdf` name, viewer does not open.
- Click Delete → confirm dialog → row disappears, storage object removed, toast shown.
- Repeat for both Books and Journals sections.
- Open viewer on a narrow mobile width (375px) → filename truncates, all action buttons visible with gaps, no overlap between Download and Close.

## Out of scope

- No DB schema changes (table, policies, and storage policies already support delete).
- No changes to upload pipeline, hierarchy, or non-standalone pages.
- No changes to `PDFPreviewModal` (legacy, unused here).
