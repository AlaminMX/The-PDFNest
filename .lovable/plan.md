

# Past Questions System — Implementation Plan

## Overview
Add a complete Past Questions system to PDFNest with its own independent course catalog (university-wide), integrated into the Faculty page as the 6th tile, the Contribute flow, and Admin dashboard.

## Architecture

```text
Faculty Page (6th tile: "Past Questions")
  └─> /past-questions/level/:level
       └─> /past-questions/level/:level/semester/:semester
            └─> /past-questions/level/:level/semester/:semester/:courseCode
                 └─> File list (reuses CourseLectureNotes-style UI)

Contribute Flow (CommunityUpload.tsx)
  └─> Faculty step shows "Past Questions" as an option
       └─> Skips department step → Level → Semester → PQ Course → Upload

Admin Dashboard
  └─> New sidebar item "Past Questions" → /admin/past-questions
       └─> Manage PQ courses (CRUD) + view/manage PQ files
```

## Database Changes

### 1. New table: `pq_courses`
Independent course catalog for past questions (not tied to departments).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| code | text NOT NULL | e.g. "GNS 101" |
| name | text NOT NULL | e.g. "Use of English" |
| level | integer NOT NULL | 100-500 |
| semester | text NOT NULL | "first" or "second" |
| color | text | For UI card styling |
| created_at | timestamptz | now() |

RLS: Anyone can SELECT; Admins can ALL.

### 2. New table: `past_questions`
Stores approved past question files.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| pq_course_id | uuid NOT NULL | References pq_courses |
| uploaded_by | uuid NOT NULL | User who uploaded |
| uploaded_by_display | text NOT NULL | Display name |
| file_path | text NOT NULL | Storage path in school_pdfs |
| title | text NOT NULL | |
| file_size | bigint NOT NULL | |
| material_type | text | "exam", "test", "assignment" |
| level | integer | |
| views | integer DEFAULT 0 | |
| created_at | timestamptz | now() |

RLS: Anyone can SELECT; Admins can ALL (manage/delete).

### 3. Alter `community_uploads`
Add nullable column `pq_course_id uuid`. When set (and department_id is null), the upload is a past question submission.

### 4. New DB function: `approve_pq_upload`
Similar to `approve_community_upload` but inserts into `past_questions` instead of `lecture_notes`.

### 5. New DB view: `pq_courses_with_counts`
Returns pq_courses with a count of past_questions per course for the course grid.

## Frontend Changes

### New Pages (4 files)

1. **`src/pages/PQLevel.tsx`** — Level selection for past questions (100-500). Queries `pq_courses` to determine which levels have content. Reuses existing LevelSelection UI pattern.

2. **`src/pages/PQSemester.tsx`** — Semester selection. Same pattern as SemesterSelection.

3. **`src/pages/PQCourses.tsx`** — 2-column course grid. Fetches from `pq_courses_with_counts` view. Shows "Coming soon" for empty states.

4. **`src/pages/PQFiles.tsx`** — File list for a specific PQ course. Fetches from `past_questions` table. Reuses CourseLectureNotes UI patterns (download, preview, share).

### New Admin Page (1 file)

5. **`src/pages/AdminPastQuestions.tsx`** — Full CRUD for `pq_courses` (add/edit/delete courses) + file management (view/delete past questions). Tabbed by semester.

### Modified Files

6. **`src/pages/FacultySelection.tsx`** — Add "Past Questions" as a special 6th tile in the grid (before School Store). Clicking navigates to `/past-questions`.

7. **`src/pages/CommunityUpload.tsx`**
   - Add "Past Questions" to the faculty step as a special option
   - When selected: skip department step, go directly to level → semester → PQ course → upload
   - Adjust step flow (STEPS array becomes dynamic based on selection)
   - Fix skeleton loading for faculties (replace empty state with skeleton while loading)
   - Store `pq_course_id` in community_uploads instead of `course_id`

8. **`src/App.tsx`** — Add routes:
   - `/past-questions` → PQLevel
   - `/past-questions/level/:level` → PQSemester  
   - `/past-questions/level/:level/semester/:semester` → PQCourses
   - `/past-questions/level/:level/semester/:semester/:courseCode` → PQFiles
   - `/admin/past-questions` → AdminPastQuestions

9. **`src/pages/AdminDashboard.tsx`** — Add "Past Questions" to sidebar items array.

10. **`src/hooks/useCommunityUploads.tsx`** — Batch-fetch `pq_courses` data for PQ uploads (display course code/name in admin review).

11. **`src/pages/AdminUploads.tsx`** — Show PQ course info for past question uploads in the review queue.

12. **`src/lib/activityLogger.ts`** — Add `"upload_approved"` and `"upload_rejected"` to ActivityType union to fix existing TS errors.

### New Hooks (2 files)

13. **`src/hooks/usePQCourses.tsx`** — Fetch PQ courses with note counts by level + semester.

14. **`src/hooks/usePastQuestions.tsx`** — Fetch past question files for a given PQ course.

## Existing Build Error Fixes (bundled)
- `useCommunityUploads.tsx` — Add missing activity types
- `StepUserType.tsx` — Cast level to proper type
- `AdminDepartmentLevels.tsx` — Fix query type assertion
- `AdminWaitlist.tsx` — Import SmartBottomNav
- `LandingPage.tsx` — Fix navigate reference
- `RepUpload.tsx` — Cast level type
- `useLectureNotes.tsx` — Fix type assertion
- `CommunityUpload.tsx` — Fix type issues

## Moderation Flow
Past question uploads go through the same moderation pipeline as regular uploads:
1. User submits via Contribute → `community_uploads` row with `pq_course_id` set
2. Admin/rep reviews in Admin Uploads page (PQ uploads show course code from `pq_courses`)
3. `approve_pq_upload` function moves file to `past_questions` table + awards contributor points
4. `reject_community_upload` works unchanged

## Technical Details
- All new pages use the same UI patterns (motion animations, skeleton loading, SmartBottomNav)
- Empty states show "Content coming soon" with disabled interaction
- Mobile responsive: 2-column grid for courses, full-width for level/semester selection
- No changes to existing faculty/department/course data or flows

