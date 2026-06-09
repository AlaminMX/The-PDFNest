
# Phase B — FYP Hub, Vibrant Faculty Tiles, Admin Notifications

## 1. FYP Hub (replaces School Store + waitlist)

### Database (single migration)
- Drop `store_waitlist` table (and related policies).
- Create `final_year_projects`:
  - `id`, `user_id` (FK auth.users), `faculty_id` (FK), `department_id` (FK, nullable), `title`, `abstract`, `author_name`, `supervisor_name`, `year` (int), `file_path` (text), `file_size` (bigint), `status` (text, default 'pending': pending/approved/rejected), `reviewed_by`, `review_note`, `reviewed_at`, `created_at`, `updated_at`.
  - GRANTs to authenticated + service_role; SELECT to anon ONLY for approved rows via policy.
  - RLS:
    - Anyone (anon + authenticated) can SELECT where `status='approved'`.
    - Authenticated users can INSERT their own (status forced to 'pending' via trigger).
    - Owner can SELECT/UPDATE/DELETE own pending rows.
    - Admins full access via `has_role`.
  - `updated_at` trigger.
- Create storage bucket `project-files` (private). Policies:
  - Authenticated users can upload to `{auth.uid()}/...`.
  - Owner + admins can read/delete.
  - Approved projects: signed URLs issued by client when user is authenticated (no public read).

### Frontend
- Delete `src/pages/SchoolStore.tsx`, `src/pages/AdminWaitlist.tsx`, `src/components/landing/WaitlistSection.tsx` references in admin/landing if any.
- Create `src/pages/ProjectsPage.tsx` at `/projects`:
  - Faculty tabs (uses `useFaculties`) + "All".
  - Grid of approved project cards: title, author, year, department, supervisor, view/download button.
  - Floating "+ Submit Project" button → bottom sheet (Drawer on mobile, Dialog on desktop) with form: title, abstract, author, supervisor, year, faculty/department selects, PDF upload.
  - On submit: upload to `project-files/{uid}/{ts}-{filename}`, insert row, toast "Submitted for review".
- Create `src/pages/AdminProjects.tsx` at `/admin/projects`:
  - List pending → approved/rejected tabs.
  - Approve/Reject buttons with optional note.
- Routing: replace `/school-store`, `/admin/waitlist` routes; add `/projects`, `/admin/projects` in `App.tsx`.
- Update sidebar + admin dashboard links: replace "School Store"/"Waitlist" with "Final Year Projects".
- Update faculty grid school store tile → "Final Year Projects" tile linking to `/projects`.

## 2. Vibrant Faculty Tiles

- Update `src/pages/FacultySelection.tsx` faculty card rendering:
  - Apply faculty `color` via inline `style={{ backgroundColor: faculty.color }}`.
  - Render `image_url` (if present) as full-bleed background image with dark overlay for legibility.
  - White text with subtle drop-shadow (`text-white drop-shadow-md`).
  - Maintain rounded corners (16px), hover scale 1.02, motion fade-in.
- Keep existing standalone-departments section untouched.

## 3. Admin Realtime Notifications

- Create `src/hooks/useAdminNotifications.ts`:
  - On mount, if user is admin, subscribe to `postgres_changes` on `community_uploads` INSERT.
  - Filter `status === 'pending'`; trigger `toast()` + browser `Notification` API (request permission once).
  - Also subscribe to `final_year_projects` INSERT (pending) for FYP submissions.
- Mount hook once in `App.tsx` (inside auth-aware wrapper) so admins get alerts globally.

## Technical notes

```text
Routes added/removed
  + /projects             (ProjectsPage)
  + /admin/projects       (AdminProjects)
  - /school-store
  - /admin/waitlist
```

- Migration is destructive: `DROP TABLE store_waitlist`. Confirmed by user previously.
- Storage bucket `project-files` created via `supabase--storage_create_bucket` (separate call) before migration policies reference it.
- Sidebar (`AppSidebar`) and any nav referring to School Store will be updated to "Final Year Projects".
- No edits to memory yet; Phase C will drop the school-store-waitlist memory entry alongside Ramadan removal.

After approval I'll execute the migration first (awaiting your confirmation in the migration dialog), then ship the frontend changes.
