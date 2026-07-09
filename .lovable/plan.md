
## 1. CopyDocumentDialog (rep + admin copy without re-upload)

New `src/components/CopyDocumentDialog.tsx` — modal that reuses the existing `copyNote` in `useLectureNotes` (backed by the `rep_copy_lecture_note` RPC, which already references the same file and preserves the original uploader).

Flow inside the dialog:
1. Load faculties + departments (`useFaculties`, `useDepartments`). Reps see only departments in their own faculty; admins see all.
2. Pick destination department(s) (checkbox list, grouped by faculty).
3. Pick target level + semester (defaults to source note's level/semester).
4. Enter target course code + name (defaults to source course). One code applies to all destinations — the RPC calls `ensure_course` per department and reuses existing courses when the code already exists.
5. Optional title override.
6. Submit → call `copyNote(...)` once, then render per-destination chips using the RPC's returned `status` (`copied` / `skipped` / `failed` with reason). Show a "Retry failed" button that re-runs only the failed department ids.
7. Empty/edge states: no destinations selected → submit disabled; all skipped → info toast "Already exists in every destination".

Wire-up in `src/pages/CourseLectureNotes.tsx`:
- Add a "Copy to another department" item to the existing note kebab menu.
- Visible when `user` is admin or rep (server-side RPC enforces same-faculty for reps, so no client check needed beyond hiding for pure guests).
- Passes source note id + source course metadata into the dialog.

No changes to storage, no file duplication, no notification changes beyond what already happens per-destination.

## 2. Fix "course delete fails" from AdminDepartmentLevels

Root cause investigation + fix:
- The current `handleDeleteCourse` swallows the real error (`toast.error("Failed to delete")` with no message). First change: surface `error.message` in the toast and `console.error` so future failures are diagnosable.
- Foreign keys pointing at `courses` are `lecture_notes` (CASCADE), `course_timetable_slots` (CASCADE), `community_uploads.course_id` (SET NULL) — so the cascade itself is fine. RLS for admins is `FOR ALL USING has_role(admin)`, which permits the delete.
- The actual blocker: when a course has approved `lecture_notes`, the CASCADE drops those rows but leaves the storage objects (school_pdfs) orphaned, and admins expect the file to go away. Worse, if any of the cascaded lecture_notes rows was referenced from `past_questions` or elsewhere via app logic, PostgREST returns without hinting at what broke.
- Fix by introducing a `SECURITY DEFINER` RPC `admin_delete_course(_course_id uuid)`:
  - Requires `has_role(auth.uid(), 'admin')`.
  - Collects distinct `file_path`s from `lecture_notes` and `past_questions` tied to that course whose reference count would drop to 0 after deletion.
  - Deletes the course row (CASCADE handles children).
  - Returns the list of orphaned file paths so the client can call `supabase.storage.from('school_pdfs').remove(paths)` in one batched call.
- `AdminDepartmentLevels.handleDeleteCourse` switches to this RPC, then removes any returned paths from storage, then refreshes. Same treatment for `handleRemoveLevel` (loops per course id or a companion `admin_delete_courses_at_level` RPC).
- Also fix `handleRejectCourse` (pending course delete) to surface real error text.

## 3. Unified, responsive admin shell (sidebar on every admin page)

Problem: only `/admin` has the shadcn-styled sidebar. `/admin/departments`, `/admin/faculties`, `/admin/reps`, `/admin/banners`, `/admin/activity`, `/admin/categories`, `/admin/uploads`, `/admin/past-questions`, `/admin/projects`, `/admin/departments/:id/levels` use `PageHeader` + `SmartBottomNav`, and the toolbar buttons on `AdminDepartments` wrap poorly on narrow screens.

Changes:
- Extract the sidebar into `src/components/AdminLayout.tsx` using shadcn `Sidebar` + `SidebarProvider` + `SidebarTrigger` (per project sidebar guidelines). The layout renders:
  - Sticky `AppSidebar` (collapsible="icon", active route highlighted via `useLocation`, pending-uploads badge, Ramadan toggle + theme toggle + sign-out pinned to the footer).
  - Header row with `SidebarTrigger`, page title slot, and optional right-side actions.
  - `<Outlet />` for the page body inside a `container mx-auto px-4 py-6` scroll area.
- Nest all `/admin/*` routes under a single `<Route element={<AdminLayout />}>` in `src/App.tsx`. `AdminLayout` runs the existing `useAdminStatus` guard once (removes duplicated guards from each page).
- Refactor each admin sub-page to:
  - Remove its `PageHeader` and `SmartBottomNav`.
  - Publish its title/subtitle/actions via a small `useAdminPageTitle` hook or a `<PageTitle>` component consumed by the layout header.
  - Move page-level admin guard checks out (handled once by the layout).
- Responsive fixes on `AdminDepartments` (and any other cluttered toolbar):
  - Replace the centered `flex flex-wrap` action row with a right-aligned action cluster that stacks on `sm:` and below (`flex flex-col sm:flex-row gap-2`).
  - Ensure inline row actions on department cards wrap correctly and use `min-w-0` + `truncate` for names.
  - Audit `AdminDepartmentLevels` course rows so pending-course action buttons wrap without overlap on ≤400px widths (`flex-wrap justify-end` already there; verify tap targets on mobile).
- Sidebar behavior on mobile: `collapsible="offcanvas"` for `<md`, `collapsible="icon"` for `≥md`, with the `SidebarTrigger` in the header always visible.

## Files changed

- `supabase/migrations/<ts>_admin_delete_course.sql` (new) — `admin_delete_course` RPC + grants.
- `src/components/CopyDocumentDialog.tsx` (new)
- `src/components/AdminLayout.tsx` (new)
- `src/components/AdminSidebar.tsx` (new — shadcn Sidebar impl)
- `src/App.tsx` — nest admin routes under `AdminLayout`.
- `src/pages/AdminDashboard.tsx` — strip its inline sidebar/header, keep dashboard content only.
- `src/pages/AdminDepartments.tsx` — remove PageHeader, use layout header, responsive toolbar.
- `src/pages/AdminDepartmentLevels.tsx` — remove PageHeader/SmartBottomNav, switch to `admin_delete_course` RPC, surface real errors, responsive tweaks.
- `src/pages/AdminReps.tsx`, `AdminBanners.tsx`, `AdminCategories.tsx`, `AdminActivity.tsx`, `AdminFaculties.tsx`, `AdminProjects.tsx`, `AdminUploads.tsx`, `AdminPastQuestions.tsx`, `AdminUserDetail.tsx` — remove `PageHeader` + `SmartBottomNav`, adopt shared layout header.
- `src/pages/CourseLectureNotes.tsx` — add "Copy to another department" kebab item + dialog wiring.

## Out of scope

- No changes to non-admin bottom navs, past-questions flow, community uploads, or standalone documents.
- No storage bucket, RLS-policy, or notification schema changes beyond the new `admin_delete_course` RPC.

## Verification

- Copy dialog: as an admin, copy a lecture note into 3 departments (2 with existing course code, 1 missing) → 2 `copied`, 1 `copied` after `ensure_course` runs; no new storage objects.
- As a rep, attempt to copy into a different faculty → RPC returns `failed: not_authorized`; retry button targets only that dept.
- Course delete: in AdminDepartmentLevels, delete a course with ≥1 lecture note → toast success, storage object removed, page refreshed. Delete a course that shares a file_path with another dept → storage kept.
- Sidebar shell: navigate through every `/admin/*` route → sidebar remains visible on desktop, collapses to icons on md, becomes offcanvas + trigger on mobile; no `PageHeader` remnants; toolbar buttons never overlap at 360px width.
