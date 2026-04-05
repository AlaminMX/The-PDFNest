

# CommunityUpload PQ Branching + Admin Enhancements

## Changes

### 1. `src/pages/CommunityUpload.tsx` — PQ branching logic
- Add `isPastQuestions` boolean state, set when user selects "Past Questions" in faculty step
- Add "Past Questions" as a special tile in the faculty step (after real faculties, with a distinct icon)
- Compute dynamic steps: when `isPastQuestions` is true, remove "department" from STEPS array and replace "course" with PQ course selection
- Add `pqCourses` state + fetch from `pq_courses` when `isPastQuestions && selectedLevel && selectedSemester`
- In course step: if PQ mode, show PQ courses instead of regular courses (no "create new course" option — admin manages PQ courses)
- In level step: if PQ mode, show fixed 100-500 levels instead of department-derived levels
- Adjust `submitFiles`: when PQ mode, insert with `pq_course_id` instead of `course_id`, set `department_id` and `faculty_id` to null
- Adjust review step to show "Past Questions" instead of faculty/department names
- Material types for PQ mode: Exam, Test, Assignment (not lecture_note)

### 2. `src/hooks/useCommunityUploads.tsx` — PQ enrichment
- Add `pq_course_id` to `CommunityUpload` interface
- Add `pq_course_code` and `pq_course_name` enriched fields
- In fetchUploads, batch-fetch `pq_courses` for rows where `pq_course_id` is set
- Merge PQ course info; for PQ uploads, set `course_code` to PQ course code for unified display
- In `approveUpload`: detect if upload has `pq_course_id` — if so, call `approve_pq_upload` instead of `approve_community_upload`

### 3. `src/pages/AdminUploads.tsx` — PQ info display
- Show "PQ:" prefix for PQ uploads in the Course column (using enriched `pq_course_code`)
- Show "Past Questions" in Department column when `department_id` is null and `pq_course_id` is set
- Approval action already delegates to the hook which now auto-detects PQ vs regular

### 4. `src/pages/AdminPastQuestions.tsx` — Admin file upload
- Add an "Upload File" button in the Files tab
- Upload dialog: select PQ course, pick file, enter title, select material type (exam/test/assignment)
- Upload to `school_pdfs` storage, insert directly into `past_questions` table (bypasses moderation since admin)
- Refresh file list after upload

## Technical Details
- Dynamic STEPS array uses `useMemo` based on `isPastQuestions` flag
- PQ material types: `[{value:"exam",label:"Exam"},{value:"test",label:"Test"},{value:"assignment",label:"Assignment"}]`
- No database migrations needed — all tables and functions already exist
- The `approve_pq_upload` RPC is already created and handles PQ approval correctly

