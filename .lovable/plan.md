
## Root causes (verified against the live DB)

1. **The upload actually fails silently at the RPC step.** `useLectureNotes.uploadNote` calls `supabase.rpc("create_rep_lecture_note", ...)` — that function **does not exist** in the database. Every rep upload throws "function does not exist" after the file has already been pushed to storage (orphaning files and leaving vague toasts).
2. **Cross-department upload is blocked by RLS.** `lecture_notes` INSERT policy: reps may only insert where `profiles.department_id = courses.department_id`. `courses` INSERT policy: reps may only create courses in their own department. So the client-side "forward to sibling department" path can never succeed even with the RPC.
3. **Course creation in a sibling department uses `status='approved'`**, which the current RLS explicitly forbids for reps — that's the "violates RLS" error.
4. **No duplicate-course guard.** No unique constraint on `(department_id, level, semester, upper(trim(code)))`. Races and capitalization variants can create duplicates.
5. **UI count bug.** `uploadProgress.total = uploadableItems.length * uploadTargets.length` and the summary reads that as "documents." Correct model is `files × destinations`.
6. **Progress feedback is per-file, not per-destination.** No visible "Uploading to Mechanical Engineering…" step; failures on one dept mark the whole item as failed.
7. **No copy system.** The only path today is re-uploading the same PDF, which wastes storage and cannot preserve the original uploader.

## Solution: one secure RPC surface + a small, honest UI rework

### 1. Database migration (`supabase/migrations/*_rep_upload_and_copy.sql`)

- **Normalize + de-dup courses**
  ```sql
  CREATE UNIQUE INDEX courses_unique_per_dept
    ON public.courses (department_id, level, semester, upper(btrim(code)));
  ```
  Backfill: pick the earliest row per key, repoint `lecture_notes.course_id` and `community_uploads.course_id` at the survivor, delete the losers. Wrap in a single transaction.

- **`public.rep_same_faculty(_user_id uuid, _dept_id uuid) RETURNS boolean`** — SECURITY DEFINER, `SET search_path=public`. Returns true when the rep's home dept and `_dept_id` share a `faculty_id`.

- **`public.ensure_course(...)` RETURNS uuid** — SECURITY DEFINER. Args: `_dept_id, _code, _name, _level, _semester, _credit_units`. Normalizes `code = upper(btrim(_code))`. Uses `INSERT ... ON CONFLICT (department_id, level, semester, upper(btrim(code))) DO UPDATE SET name = COALESCE(courses.name, EXCLUDED.name) RETURNING id`. Authorization: allow if `has_role(caller,'admin')` OR (`has_role(caller,'rep')` AND `rep_same_faculty(caller,_dept_id)`), else `RAISE EXCEPTION 'not_authorized'`. Marks new rows `status='approved'`, `suggested_by = auth.uid()`.

- **`public.rep_upload_lecture_note(...)` RETURNS uuid** — SECURITY DEFINER. Args: `_course_id, _file_path, _title, _file_size, _display_name, _material_type, _level`. Authorization: admin, or rep in the same faculty as `courses.department_id`. Duplicate guard: if a row already exists with the same `course_id` + `title` (case-insensitive) OR same `file_path`, append `{2}`, `{3}`, … to the title. Inserts the row and returns the new id.

- **`public.rep_copy_lecture_note(_source_note_id uuid, _target_dept_ids uuid[], _target_level int, _target_semester text, _target_course_code text, _target_course_name text, _title_override text)` RETURNS jsonb** — SECURITY DEFINER. For each target dept: verify caller is admin OR rep in the same faculty as that dept; call `ensure_course`; if a lecture_note already exists in that course with the same `file_path` OR normalized `title` → mark as `skipped`. Otherwise insert a new `lecture_notes` row that **reuses `file_path`, `file_size`, `uploaded_by`, `uploaded_by_display` from the source** (preserve original attribution, per your choice), with the target `course_id` and `level`. Returns `jsonb` of shape `[{department_id, status: 'copied'|'skipped'|'failed', note_id?, reason?}]`.

- **RLS grants.** All three RPCs `GRANT EXECUTE ... TO authenticated`. No changes to existing table policies — the RPCs are the only cross-dept path, and their SECURITY DEFINER body encapsulates authorization.

- **Reference-counting delete safety.** When any `lecture_notes` row is deleted, a `BEFORE DELETE` trigger checks whether any other row still references `OLD.file_path`; if so it skips the storage cleanup contract (the client already only deletes storage on the last reference — we'll enforce it here so a copy can't be orphaned). Concretely: add a helper `public.file_path_reference_count(text) RETURNS int` and update `useLectureNotes.deleteNote` to call it and only run `storage.remove` when count reaches 0.

### 2. `src/hooks/useLectureNotes.tsx`

- Replace the broken `create_rep_lecture_note` call with `supabase.rpc('rep_upload_lecture_note', ...)`.
- On storage-upload success but RPC failure, `storage.remove(filePath)` to avoid orphaned blobs.
- Move the duplicate-title logic server-side (RPC handles it) and delete the client SELECT+scan.
- Update `deleteNote` to check `file_path_reference_count` before `storage.remove`.
- Add `copyNote(sourceId, targets, courseSpec, titleOverride?)` that calls `rep_copy_lecture_note` and returns the per-destination result array.

### 3. `src/pages/RepUpload.tsx` — targeted rework, not a rewrite

- **Counting fix.** Replace every "documents" count derived from `files × depts` with two independent numbers: `files.length` and `destinations.length`. Header reads `"Uploading {files} document · {depts} destination"` (pluralize each independently). `uploadProgress.total` = `files.length` only; internal per-destination progress uses a `Map<fileId, {done,total}>`.
- **Auto-create with confirm (per your choice).** When the rep selects sibling depts that don't yet have the course, no per-department AlertDialog. Instead, on "Upload," if any selected destinations are missing the course, open one confirm dialog: "Create CSC 301 in Mechanical Engineering, Civil Engineering? These uploads will continue automatically." On confirm, call `ensure_course` for each missing dept in parallel, then proceed. Cancel = keep only ready destinations.
- **Per-destination progress.** Render, under each file card, a small list of chips: `Computer Engineering ✓`, `Mechanical Engineering …`, `Civil Engineering ✗ retry`. Retry button re-runs only the failed destinations for that file.
- **Success summary.** Replace the current terse toasts with a summary dialog that lists file → destinations (✓ / skipped / ✗) and a `Close` button. Toast stays as a short confirmation.
- **Sequence per file:** `[convert if needed]` → **upload once** → **loop destinations** calling `rep_upload_lecture_note` in parallel (max 3). One storage upload per file, never per destination — this is what makes "1 file to N depts" honest.

### 4. New copy UI

- `src/components/CopyDocumentDialog.tsx` — reusable modal. Props: `sourceNote`, `open`, `onOpenChange`, `mode: 'admin'|'rep'`.
  - Step 1: pick destination faculty (admins) or auto-lock to home faculty (reps).
  - Step 2: multi-select departments (visible ones only) and level + semester.
  - Step 3: course picker per selected dept — shows existing match by normalized code, or "Create `<CODE> — <NAME>` here" inline; both resolved via `ensure_course` when the user confirms.
  - Step 4: confirm → calls `useLectureNotes.copyNote` → shows per-destination progress + final summary.
- Entry points: add a "Copy" action to the existing note kebab menu in `CourseLectureNotes.tsx` (visible to admins always, and to reps whose home faculty matches the source's faculty). Nothing changes for viewers.

### 5. Universal Search / other pages

No change required; copies are ordinary `lecture_notes` rows so they surface in existing search, department pages, and notifications for free.

## Verification

- `psql` before/after: confirm the RPCs exist, the unique index is present, and a synthetic rep can insert into a sibling faculty dept only through the RPC (direct INSERT still 403s).
- Playwright headless against `localhost:8080`, signed in as a seeded rep:
  1. Upload 1 PDF, 3 sibling depts (one missing the course). Assert single confirm dialog, three lecture_notes rows sharing one `file_path`, header shows "1 document · 3 destinations."
  2. Kill the network for one destination mid-run; confirm the file card shows two ✓ and one ✗ with a working Retry.
  3. Copy the resulting note into a 4th dept; confirm no new storage object, new DB row, original `uploaded_by` preserved.
  4. Attempt to copy into a dept in another faculty as a rep — expect the destination to be filtered out client-side and `rep_copy_lecture_note` to return `failed: not_authorized` if forced via devtools.
- Screenshots after each step, viewed via `code--view`.

## Files touched

- `supabase/migrations/<ts>_rep_upload_and_copy.sql` (new)
- `src/hooks/useLectureNotes.tsx`
- `src/pages/RepUpload.tsx`
- `src/pages/CourseLectureNotes.tsx` (add Copy action)
- `src/components/CopyDocumentDialog.tsx` (new)
- `src/integrations/supabase/types.ts` (auto-regenerated after migration)

## Out of scope

- No changes to past-questions, community-uploads, or standalone-documents flows (their pipelines are separate and currently healthy).
- No changes to storage bucket configuration.
- No change to notifications payload shape — copies fire the same `notify-department-users` call per destination.
