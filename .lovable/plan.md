

## Assumptions

- **Frontend**: React 18 + Vite + Tailwind CSS + TypeScript + framer-motion
- **Backend**: Lovable Cloud (Supabase) with existing profiles, departments, courses, pdf_files, admin_banners tables
- **Auth**: Supabase auth with existing Google OAuth via `supabase.auth.signInWithOAuth`
- **PWA**: vite-plugin-pwa configured; OAuth route `/~oauth` must be excluded from service worker
- **Existing department grouping**: `department_categories` table exists but user wants a dedicated `faculties` table
- **Theme**: next-themes with `storageKey="pdfnest-theme"`, dark default

---

## Plan (Single Execution Cycle)

### 1. Database Migrations

**a) Create `app_settings` table** for Ramadan toggle and future admin-controlled feature flags:
- Columns: `key` (text, PK), `value` (text), `updated_at` (timestamptz)
- Seed with `ramadan_theme_enabled = 'false'`
- RLS: anyone can SELECT, only admins can UPDATE

**b) Create `faculties` table**:
- Columns: `id` (uuid PK), `name` (text), `slug` (text unique), `icon` (text), `color` (text), `display_order` (integer), `is_visible` (boolean default true), `created_at` (timestamptz)
- RLS: anyone can SELECT, admins can ALL

**c) Add `faculty_id` (uuid, nullable) to `departments` table** referencing `faculties.id`

### 2. Ramadan Theme (Section 1)

- Create `src/hooks/useAppSettings.tsx` hook that queries `app_settings` for `ramadan_theme_enabled` (cached, fetched on load)
- Create `src/components/RamadanDecoration.tsx` — a subtle hanging crescent moon SVG at top-right of homepage with gentle CSS sway animation
- Modify `ThemeToggle.tsx` — when Ramadan mode is active, replace Sun/Moon icons with a crescent moon icon
- Add Ramadan toggle to `AdminDashboard.tsx` sidebar or settings area as a Switch component
- Condition rendering of decorations based on the setting value

### 3. Google Sign-Up (Section 2)

- Run the `configure-social-auth` tool to generate Lovable Cloud managed OAuth module
- Update `Auth.tsx` and `SignupWizard.tsx` to use `lovable.auth.signInWithOAuth("google", ...)` instead of `supabase.auth.signInWithOAuth`
- Add `/~oauth` to `navigateFallbackDenylist` in `vite.config.ts`
- Keep existing Google profile creation logic (`ensureGoogleProfile`)
- Preserve error handling for cancelled login, duplicate emails, network errors

### 4. Signup Flow Cleanup (Section 3)

- Remove "Financial literacy" and "Novels" question blocks from `StepPreferences.tsx`
- Remove `financialLiteracyInterest` from `SignupData` interface and `initialData`
- Remove from profile save payload in `SignupWizard.tsx`
- Ensure Age and Usage Reason display correctly in `AdminUserDetail.tsx` (already present) and `AdminDashboard.tsx` user table (add Age column)

### 5. Admin Enhancements (Section 4)

- **User Deletion**: Already implemented in `AdminUserDetail.tsx`. Add a proper `AlertDialog` confirmation modal instead of `window.confirm`. Ensure the `delete-user-account` edge function deletes storage files (verify existing logic handles this)
- **Ramadan Toggle**: Add to admin sidebar or dashboard as a card with Switch component that updates `app_settings`

### 6. Light Theme Fix (Section 5)

- Adjust CSS variables in `src/index.css` for light mode:
  - Increase foreground contrast (darken `--foreground`)
  - Strengthen `--border` color for visibility
  - Improve `--muted-foreground` contrast
  - Ensure button text meets WCAG AA contrast ratio
- Test card borders, input borders, and text readability

### 7. Faculties Layer (Section 6)

- Create `src/pages/FacultySelection.tsx` — lists faculties with department counts
- Create `src/hooks/useFaculties.tsx` — fetches faculties with department counts
- Update routing in `App.tsx`:
  - `/afit-pdfs` → `FacultySelection` (was departments list)
  - `/afit-pdfs/:facultySlug` → new page showing departments filtered by faculty
  - `/afit-pdfs/:facultySlug/:deptSlug` → `SemesterSelection`
  - `/afit-pdfs/:facultySlug/:deptSlug/semester/:semester` → `DepartmentCourses`
  - `/afit-pdfs/:facultySlug/:deptSlug/semester/:semester/:courseCode` → `CourseLectureNotes`
- Create `src/pages/AdminFaculties.tsx` for admin CRUD (add/edit/delete faculties)
- Add "Faculties" to admin sidebar navigation
- Update `AdminDepartments.tsx` to include faculty assignment when editing departments

### Files Modified/Created

**New files**: `RamadanDecoration.tsx`, `useAppSettings.tsx`, `FacultySelection.tsx`, `useFaculties.tsx`, `AdminFaculties.tsx`

**Modified files**: `ThemeToggle.tsx`, `StepPreferences.tsx`, `SignupWizard.tsx`, `Auth.tsx`, `AdminDashboard.tsx`, `AdminUserDetail.tsx`, `AdminDepartments.tsx`, `AFITPDFs.tsx`, `App.tsx`, `vite.config.ts`, `index.css`, `Index.tsx`

**Database**: 2 migrations (app_settings + faculties table, departments.faculty_id column)

