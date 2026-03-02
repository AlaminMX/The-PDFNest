

## Issues Identified

1. **Session Logs 404**: Admin sidebar links to `/admin/sessions` but `App.tsx` route is `/admin/logs` pointing to `AdminSessionLogs`. There's also a separate `AdminActivityLogs` page but no route for it — the `/admin/logs` route loads `AdminSessionLogs`.
2. **Sidebar light theme**: Sidebar is hardcoded with `bg-[#1c1c1c] text-white` and `bg-white/20` borders, ignoring light/dark theme entirely.
3. **Faculty grid display**: Currently uses a single-column list layout, not a grid. No faculty color applied to buttons.
4. **Admin Departments missing faculty assignment**: No `faculty_id` field in create/edit department forms.
5. **Ramadan theme too minimal**: Only a small crescent in top-right corner with red primary color. User wants site-wide gold aesthetic.
6. **Activity logging incomplete**: Two separate logging systems (`activityLogger.ts` and `sessionLogger.ts`) exist but many actions aren't logged. Need a unified, comprehensive log view.

## Plan

### 1. Fix Session Logs 404
- Add route `/admin/sessions` → `AdminSessionLogs` in `App.tsx`
- Keep `/admin/logs` → `AdminActivityLogs` (currently points to SessionLogs, fix this)
- Merge Activity Logs and Session Logs into one unified "Site Activity" page at `/admin/logs` that shows both `user_activity_logs` and `user_sessions` data with tabs

### 2. Fix Sidebar Light Theme
- Remove hardcoded `bg-[#1c1c1c] text-white` from `AppSidebar` in `Index.tsx`
- Replace with theme-aware classes: `bg-sidebar-background text-sidebar-foreground`
- Replace all `bg-white/20` dividers with `bg-sidebar-border`
- Replace `text-white` references with `text-sidebar-foreground`
- Update light theme CSS variables for sidebar in `index.css` to ensure proper contrast

### 3. Faculty Grid Display with Colors
- Change `FacultySelection.tsx` layout from single-column to 2-column responsive grid (`grid-cols-2`)
- Apply faculty `color` to each card's icon container and left border/accent, similar to `DepartmentTile`
- Use `getDepartmentStyles` utility (or similar) to derive colors from the faculty's color field

### 4. Admin Department → Faculty Assignment
- In `AdminDepartments.tsx`, add a `faculty_id` Select dropdown in both the create and edit dialogs
- Fetch faculties list using `useFaculties` hook
- Save `faculty_id` on insert/update to the `departments` table

### 5. Ramadan Theme — Site-Wide Gold Aesthetic
- When `ramadan_theme_enabled` is true, inject a `.ramadan` class on the root element
- Add CSS variables for Ramadan theme in `index.css` that override primary color to gold (`42 87% 55%`), accent to warm gold tones
- Update `RamadanDecoration.tsx` to use gold color instead of primary red, position it so it doesn't block content (top-right with offset)
- Add subtle gold border/accent to cards site-wide when Ramadan is active
- Apply the ramadan class in `App.tsx` or a layout wrapper based on `useAppSettings`

### 6. Comprehensive Activity Logging
- Consolidate admin log views: create a unified `/admin/logs` page with two tabs — "Activity Feed" (from `user_activity_logs`) and "Sessions" (from `user_sessions`)
- Fix route mismatch in `App.tsx`: `/admin/logs` → unified logs page, `/admin/sessions` → same page (redirect or alias)
- Ensure `logActivity` calls exist for all major user actions (verify coverage in upload, delete, rename, download, AI features, profile updates, login/logout, page views)

### Files to Modify
- `src/App.tsx` — fix routes
- `src/pages/Index.tsx` — fix sidebar theme classes
- `src/index.css` — add Ramadan gold theme variables, fix sidebar light theme variables
- `src/pages/FacultySelection.tsx` — grid layout + color display
- `src/pages/AdminDepartments.tsx` — add faculty_id select
- `src/components/RamadanDecoration.tsx` — gold color, better positioning
- `src/pages/AdminSessionLogs.tsx` — merge into unified log page with tabs
- `src/pages/AdminActivityLogs.tsx` — merge into unified log page
- `src/pages/AdminDashboard.tsx` — fix sidebar item paths

### Database
- No schema changes needed (all tables already exist)

### Risk Analysis
- Sidebar color changes affect the main homepage layout — must test both themes
- Ramadan gold override must not break non-Ramadan mode
- Route changes must not break existing admin navigation

