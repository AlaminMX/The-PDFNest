

# Global Smart Search System — Implementation Plan

## Overview
Build a command-palette-style global search that queries courses (department-specific), PQ courses, lecture notes, and past questions. Supports course code detection, multi-department disambiguation, and keyword hints for smart filtering.

## Architecture

```text
GlobalSearch component (CommandDialog overlay)
  ├─ Triggered from: PageHeader search icon + keyboard shortcut (Ctrl+K)
  ├─ Input parsing: detectCourseCode() + extractKeywordHint()
  └─ Results grouped in sections:
       1. Course Matches (dept courses + PQ courses)
       2. PDFs / Lecture Notes
       3. Past Questions
```

## Search Data Strategy

**Single edge function `search-global`** performs all queries server-side and returns grouped results. This avoids multiple client-side queries and keeps the search fast.

Input: `{ query: string }`

Logic:
1. Parse query → extract course code pattern (`/^[A-Z]{2,4}\s?\d{2,3}/i`) and remaining keywords
2. If course code found:
   - Query `courses` table for matching code (returns multiple departments)
   - Query `pq_courses` table for matching code
   - If keyword hint exists (e.g. "cyber"), filter/prioritize by department name match
3. Query `lecture_notes` by title ILIKE
4. Query `past_questions` by title ILIKE
5. Return `{ courses: [...], pqCourses: [...], lectureNotes: [...], pastQuestions: [...] }`

Each course result includes: `id, code, name, department_id, department_name, department_slug, faculty_slug, level, semester`

**Performance**: Uses `ILIKE` with indexed prefix matching. Results capped at 5 per section. Debounced 300ms on client.

## New Files

### 1. `supabase/functions/search-global/index.ts`
Edge function that accepts a query string, parses it, runs parallel Supabase queries across `courses` (joined with `departments` and `faculties`), `pq_courses`, `lecture_notes`, and `past_questions`. Returns grouped results with navigation metadata.

### 2. `src/components/GlobalSearch.tsx`
Command dialog component using the existing `Command` primitives from `src/components/ui/command.tsx`:
- Search input with debounce (300ms)
- Grouped result sections: "Courses", "Past Question Courses", "PDFs", "Past Questions"
- Multi-department disambiguation: when a course code matches 2+ departments, shows each as a separate clickable item with department name
- Smart keyword hint: if query is "MTH102 cyber", the "Cyber Security" department result is shown first
- Click behavior:
  - Course → navigate to `/afit-pdfs/:facultySlug/:deptSlug/level/:level/semester/:semester/:courseCode`
  - PQ Course → navigate to `/past-questions/level/:level/semester/:semester/:courseCode`
  - Lecture note → navigate to course page (the course it belongs to)
  - Past question file → navigate to PQ course page
- Empty state: "No results found. Try another keyword or upload material."
- Keyboard: opens with Ctrl+K / Cmd+K, Escape closes

### 3. `src/hooks/useGlobalSearch.ts`
Hook that manages debounced query state, calls the edge function via `supabase.functions.invoke('search-global', { body: { query } })`, and returns `{ results, loading, error }`.

## Modified Files

### 4. `src/components/PageHeader.tsx`
- Add a search icon button (magnifying glass) next to ThemeToggle
- Clicking opens GlobalSearch dialog
- On mobile: search icon in header; on desktop: also show "Ctrl+K" hint

### 5. `src/pages/FacultySelection.tsx`
- Add a search bar at the top of the faculty grid (larger search input that opens GlobalSearch on focus/click)

### 6. `src/App.tsx`
- Add lazy import for search edge function (no route needed — it's a dialog overlay)

## Edge Function Query Design

```sql
-- Course matches (with department info)
SELECT c.id, c.code, c.name, c.level, c.semester,
       d.id as dept_id, d.name as dept_name, d.slug as dept_slug,
       f.slug as faculty_slug
FROM courses c
JOIN departments d ON d.id = c.department_id
LEFT JOIN faculties f ON f.id = d.faculty_id
WHERE c.code ILIKE $1 OR c.name ILIKE $2
ORDER BY CASE WHEN c.code ILIKE $1 THEN 0 ELSE 1 END
LIMIT 10;

-- PQ course matches
SELECT id, code, name, level, semester
FROM pq_courses
WHERE code ILIKE $1 OR name ILIKE $2
LIMIT 5;

-- Lecture notes
SELECT ln.id, ln.title, ln.file_path, c.code as course_code,
       d.slug as dept_slug, f.slug as faculty_slug, c.level, c.semester
FROM lecture_notes ln
JOIN courses c ON c.id = ln.course_id
JOIN departments d ON d.id = c.department_id
LEFT JOIN faculties f ON f.id = d.faculty_id
WHERE ln.title ILIKE $2
LIMIT 5;

-- Past questions
SELECT pq.id, pq.title, pq.file_path, pc.code as course_code,
       pc.level, pc.semester
FROM past_questions pq
JOIN pq_courses pc ON pc.id = pq.pq_course_id
WHERE pq.title ILIKE $2
LIMIT 5;
```

## Multi-Department Disambiguation

When course code matches multiple departments, results appear as:

```
Courses
  MTH102 · Computer Science     →  click navigates to CS course page
  MTH102 · Cyber Security       →  click navigates to Cyber course page
  MTH102 · Mechanical Eng.      →  click navigates to Mech course page
```

If keyword hint present (e.g. "cyber"), results with matching department name sort first.

## UI Details
- Uses existing `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem` from `src/components/ui/command.tsx`
- Each result item shows an icon (BookOpen for courses, FileText for PDFs, ScrollText for PQs)
- Loading spinner while searching
- Mobile: full-width dialog, touch-friendly hit targets
- No layout shift — dialog is an overlay

## No Database Migrations Needed
All tables already exist. The edge function queries existing data.

