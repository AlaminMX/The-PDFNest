

## Plan: Semester-Aware Course Management in Admin Dashboard

### Current State
- The `courses` table already has a `semester` column (default: `'first'`), so **no database migration is needed**.
- The **RepUpload** page already has semester selection working correctly -- it passes `selectedSemester` to `useCourses` and filters properly.
- The **Admin Reps** page (create and edit dialogs) is the problem: it has no semester awareness. All courses are fetched/created without a semester filter, and new courses are inserted without specifying a semester (defaulting to `'first'`).

### Changes Required

#### 1. `src/pages/AdminReps.tsx` — Edit Dialog: Add Semester Tabs
- Add `editSemester` state (default: `"first"`).
- Update `fetchCoursesForDepartment` to accept and filter by semester.
- Add a semester tab/select above the course list in the edit dialog so admin can switch between first and second semester courses.
- When switching semesters, re-fetch courses for that semester.
- When inserting new courses in the edit flow, include `semester: editSemester`.

#### 2. `src/pages/AdminReps.tsx` — Create Dialog: Add Semester per Course
- Add a `selectedCreateSemester` state to the create dialog.
- Add semester tabs/select in the "Courses Offered" section of the create dialog.
- Track courses separately per semester, or add a semester field to each course entry.
- When inserting courses during rep creation, include the correct `semester` value.

#### 3. `src/pages/AdminReps.tsx` — Course Interface Update
- Extend the `Course` interface to include `semester?: string`.
- Pass semester through all course CRUD operations (add, update, delete).

### Files Modified
- `src/pages/AdminReps.tsx` (sole file)

### What Stays Unchanged
- Database schema (semester column already exists)
- RepUpload page (already working)
- `useCourses` hook (already supports semester filtering)
- All other pages and components

