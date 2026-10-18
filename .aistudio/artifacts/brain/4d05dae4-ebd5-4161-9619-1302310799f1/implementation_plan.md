# Implementation Plan - Course Rep Creation Flow & Metadata Enhancements

This plan outlines the updates to the Course Rep creation flow in the Admin Panel (`AdminReps.tsx`), database profiles schema, and upload checks, incorporating academic levels, cohort year sets (e.g. U25), and granular permission toggles.

## Proposed Changes

### 1. Database Schema / Profile Attributes
Ensure the `profiles` table (or rep metadata) supports:
- `level` (integer): Rep's assigned academic level (100, 200, 300, 400, 500).
- `rep_cohort` (string): Cohort year set identifier (e.g., U25, U24, U23).
- `allow_cross_level` (boolean): Permission toggle to allow uploading to other levels (default: `false`).
- `allow_cross_department` (boolean): Permission toggle to allow uploading to other departments (default: `false`).
- `allow_cross_faculty` (boolean): Permission toggle to allow uploading to other faculties (default: `false`).

### 2. Admin Rep Creation Modal (`src/pages/AdminReps.tsx`)
- **Remove Initial Courses**: Remove the dynamic course adding section/inputs from the "Add Course Rep" modal.
- **Add Rep Level Selection**: Add a level dropdown selector (100, 200, 300, 400, 500).
- **Add Cohort Set Input**: Add a text input for cohort year set (e.g., U25, U24).
- **Add Permission Toggles**: Add switches/checkboxes for:
  - Allow uploading to other levels
  - Allow uploading to other departments
  - Allow uploading to other faculties
- **Save Profile Metadata**: Update the backend creation call to save these fields into the user's `profiles` record along with the `"rep"` role.

### 3. Edit Rep Modal (`src/pages/AdminReps.tsx`)
- Update the edit rep dialog to also display and edit:
  - Rep level & cohort year set
  - Cross-level / cross-department / cross-faculty upload permission toggles

### 4. Upload Permission Enforcement (where applicable)
- In upload flows (e.g., `CommunityUpload.tsx`, `RepUpload.tsx`), check whether the rep has `allow_cross_level` / `allow_cross_department` enabled if they attempt to upload outside their assigned scope.

## Verification Plan
- **Automated Build/Lint**: Run `compile_applet` and `lint_applet` to verify TypeScript types and syntax.
- **Manual Verification**: Test opening the Admin Reps modal, creating a rep without initial courses, specifying level, cohort, and permission toggles, and verifying profile updates.
