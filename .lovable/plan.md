# PDFNest Major Upgrade — Phased Plan

Splitting the 10-section spec into 3 phases. Each phase is approved/built independently.

---

## Phase A — Routing, Auth Flow & Onboarding (Sections 1, 2, 3)

**1. Landing page session bypass** (`src/pages/LandingPage.tsx`)
- On mount, call `supabase.auth.getSession()`; show centered `animate-spin` circle while checking; redirect to `/dashboard` if session exists; otherwise render landing as today.

**2. Onboarding flow** — replaces the current 5-step SignupWizard
- New `src/pages/Onboarding.tsx`: 3-step wizard (Faculty → Department → Level 100–500) on dark dot-grid background, top progress bar, `01 / 03` counter, "Skip for now" link that still marks complete.
- Auth.tsx becomes email/password only (signup collects email+password). After signup/login, check `profiles.onboarding_complete`; if false, route to `/onboarding` before `/dashboard`.
- Remove `SignupWizard` and its step components from the signup path (files kept until Phase A merges then deleted in cleanup).
- Migration: add `onboarding_complete boolean default false`, `faculty_id`, `department_id`, `level` to `profiles` (idempotent `add column if not exists`). Backfill existing profiles to `onboarding_complete = true` so returning users skip.

**3. Standalone departments (no faculty)**
- New helper `src/lib/browseNavigation.ts` (`buildBrowsePath`).
- Update `LevelSelection`, `SemesterSelection`, `DepartmentCourses`, `CourseLectureNotes` to treat `facultySlug` as optional and build paths via helper (covers share URL in CourseLectureNotes).
- Add 4 new routes in `App.tsx`: `/afit-pdfs/dept/:deptSlug[...]` mapping to the same page components.
- In `FacultySelection.tsx`: after faculty grid render faded separator, then 2-col grid of standalone departments (`faculty_id IS NULL AND is_visible = true`) using existing tile styling. Fix `goToNote` so notes with no faculty_slug still navigate via `buildBrowsePath`.
- Admin `AdminDepartments` form: add "— No Faculty (Standalone) —" option that sets `faculty_id = null`.

---

## Phase B — FYP Hub, Faculty Tiles, Admin Notifications (Sections 4, 5, 6)

**4. School Store → FYP Hub** (full replacement, waitlist removed)
- Migration:
  - Create table `final_year_projects` (title, description, student_name, faculty_id, file_url, file_type pdf/docx/xlsx, status pending/approved/rejected, submitted_by, created_at) with GRANTs to authenticated + service_role, RLS, policies (public read approved, authenticated insert own, admin manage via `has_role`).
  - Create storage bucket `project-files` (public) with size/mime restrictions and ownership-scoped INSERT policy.
  - Drop `school_store_waitlist` table and related policies.
- Code:
  - Delete `src/pages/SchoolStore.tsx` and `src/pages/AdminWaitlist.tsx`; remove waitlist routes/links/memory.
  - New `src/pages/ProjectsPage.tsx` at `/projects`: "FYP Hub" header with `GraduationCap`, faculty tabs ("All" + per faculty), project cards (title, student, faculty badge, file-type badge, Download). Floating "+ Submit Project" → auth-gated bottom sheet with form + file upload to `project-files` bucket, inserts row as `pending`.
  - `FacultySelection.tsx`: replace School Store tile with FYP Hub tile pointing to `/projects`.
  - New `AdminProjects` page/tab in `AdminDashboard`: pending-first list with Approve/Reject buttons updating `status`.

**5. Faculty tile vibrant colors**
- `FacultyCard` in `FacultySelection.tsx`: apply raw `color` via inline `style.backgroundColor` (no overlay, no opacity reduction); white text + drop shadow; honor `image_url` as full-bleed background. Fallback to `getDepartmentStyles()` only when no color.

**6. Admin browser notifications**
- New `src/hooks/useAdminNotifications.ts` (Notification API + Supabase realtime on `community_uploads` INSERT, filter `status === 'pending'`).
- Call hook in `AdminDashboard.tsx`.

---

## Phase C — Sidebar, Bottom Nav, Profile Loader, Ramadan Removal (Sections 7, 8, 9, 10)

**7. Sidebar editorial aesthetic** (`AppSidebar` inside `src/pages/Index.tsx`)
- Background: `bg-[#FAFAF8] dark:bg-[#0E0E0D]`.
- Remove every horizontal divider div.
- Slim AFIT PDFs button: 40px height, rounded-lg, left primary accent border, primary tint.
- Group labels: `uppercase text-[10px] tracking-widest font-medium text-sidebar-foreground/40 px-3 py-1`.
- Menu items: `py-1.5 px-3 rounded-md` (PDF file rows: `text-xs py-1 px-2`).
- Replace translate hover with `border-l-2 border-transparent hover:border-primary/40 data-[active=true]:border-primary`.

**8. Bottom nav indicator fix** (`src/components/BottomNav.tsx`)
- Move `motion.div layoutId="bottomNavIndicator"` inside the icon wrapper. Final classes: `absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full`.

**9. Profile page loading screen** (`src/pages/UserProfile.tsx`, also `RepProfile.tsx`, `PublicProfile.tsx`)
- Add `loading` state; while loading render centered framer-motion book-flip animation (two `w-8 h-10 bg-muted` rectangles alternating `rotateY(180deg)` at 0.6s). Show "Profile not found" only after `loading=false && profile===null`.

**10. Remove Ramadan theme**
- Delete `src/components/RamadanDecoration.tsx`.
- Remove every import/usage, the admin toggle, and any setting/state related to it.
- Leave `NewYearModal` intact.
- Drop the `ramadan-theme` memory entry.

---

## Memory updates (after each phase)
- Replace `User Onboarding` memory with new 3-step flow.
- Remove `School Store Waitlist`, `Faculty Page Layout` (re: store tile), `Ramadan Theme`, and old `Sidebar Visual System` entries; add FYP Hub, standalone-dept, sidebar-editorial entries.

## Notes / risks
- AdminDashboard path in spec (`src/pages/admin/AdminDashboard.tsx`) doesn't exist; actual file is `src/pages/AdminDashboard.tsx` — will use that.
- Replacing the SignupWizard removes step components currently referenced by Auth flow; they'll be deleted in Phase A.
- Waitlist table drop is destructive — assumes user truly wants it gone (confirmed).

---

**Start with Phase A?** Approve and I'll implement sections 1–3 in one batch.
