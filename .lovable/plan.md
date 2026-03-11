

# General Upload System + Contributor System + Moderation Flow

This is a large-scale feature spanning database schema changes, new pages, admin/rep dashboard updates, and a contributor rewards system. It must be implemented in **multiple phases** to ensure stability.

---

## Phase 1: Database Schema + Core Tables

### New Tables

**`community_uploads`** - Central table for user-submitted materials:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) - uploader
- `faculty_id` (uuid, FK → faculties)
- `department_id` (uuid, FK → departments)
- `course_id` (uuid, FK → courses)
- `level` (integer, NOT NULL)
- `semester` (text, NOT NULL)
- `title` (text, NOT NULL)
- `description` (text, nullable)
- `material_type` (text, NOT NULL) - enum-like: lecture_note, past_question, assignment, summary, other
- `file_path` (text, NOT NULL) - storage path in `school_pdfs`
- `original_file_name` (text, NOT NULL)
- `file_size` (bigint, NOT NULL)
- `file_hash` (text, nullable) - for duplicate detection
- `status` (text, NOT NULL, default 'pending') - pending, approved, rejected
- `reviewed_by` (uuid, nullable) - admin or rep who reviewed
- `review_note` (text, nullable) - optional reason
- `reviewed_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

RLS: Users can INSERT own rows, SELECT own rows. Admins can SELECT/UPDATE/DELETE all. Reps can SELECT/UPDATE uploads in their department scope.

**`contributor_points`** - Tracks contribution credits:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, UNIQUE)
- `total_points` (integer, default 0)
- `approved_count` (integer, default 0)
- `rejected_count` (integer, default 0)
- `pending_count` (integer, default 0)
- `updated_at` (timestamptz, default now())

RLS: Users can SELECT own. Admins can SELECT all. Public leaderboard view created separately.

**`contributor_badges`** - Badges earned by users:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `badge_type` (text, NOT NULL) - first_upload, course_helper, department_contributor, top_contributor
- `earned_at` (timestamptz, default now())
- UNIQUE(user_id, badge_type)

RLS: Users can SELECT own. Anyone authenticated can SELECT (for profile viewing).

**`contributor_leaderboard`** (VIEW) - Aggregated from contributor_points + profiles:
- Ranks users by total_points, filterable by department

### Database Functions

- `approve_community_upload(p_upload_id, p_reviewer_id, p_note)`: Sets status to approved, creates corresponding `lecture_notes` entry, increments contributor points, checks badge eligibility
- `reject_community_upload(p_upload_id, p_reviewer_id, p_note)`: Sets status to rejected, increments rejected count
- `check_duplicate_upload(p_file_hash, p_file_name, p_file_size, p_course_id)`: Returns matching uploads for duplicate warning

---

## Phase 2: Upload Flow UI

### New Page: `/contribute` (CommunityUpload.tsx)

A step-by-step wizard with dependent selectors:

1. **Faculty** - dropdown from `faculties` (visible only)
2. **Department** - filtered by selected faculty
3. **Level** - 100-500, from existing course levels in that department
4. **Semester** - First/Second
5. **Course** - filtered by department + level + semester
6. **File Upload** - PDF, DOC/DOCX, PPT/PPTX, images. Non-PDF auto-converted via existing `convert-to-pdf` edge function
7. **Metadata** - Title (required), Description (optional), Material Type (select)
8. **Submit** - file hash computed client-side, duplicate check before submission, then insert into `community_uploads` with status='pending'

Success message: "Your material has been submitted for review. It will appear once approved."

Entry points: Add "Contribute Material" button to SmartBottomNav, FloatingActionButton, and sidebar.

---

## Phase 3: Moderation Flow

### Admin Dashboard Addition: `/admin/uploads`

- New sidebar item "Pending Uploads"
- Table showing all pending community uploads with:
  - Uploader name, material title, course/department path, file size, date
  - Preview button (opens file)
  - Approve / Reject buttons with optional note
- Filter by status (pending/approved/rejected), department, date

### Rep Dashboard Addition

- Reps see pending uploads for their department only (via RepProfile or new RepModeration component)
- Same approve/reject flow, scoped to their department

### Approval Logic

When approved:
- Status updated to 'approved'
- A new `lecture_notes` row is created linking to the same file
- Contributor points incremented (+10)
- Badge eligibility checked and awarded
- Uploader gets notification

When rejected:
- Status updated to 'rejected'
- No points awarded
- Uploader gets notification with reason

---

## Phase 4: Contributor System + Profile Updates

### Contributor Profile Section (UserProfile.tsx)

Add a "Contributions" card to the profile:
- Approved uploads count
- Total points
- Badges earned (clean minimal icons)
- Department rank

### Badges

Four initial badges:
- **First Upload** - first approved upload
- **Course Helper** - 5+ approved uploads
- **Department Contributor** - 10+ approved uploads in one department
- **Top Contributor** - 25+ approved uploads or top 3 in leaderboard

### Leaderboard Page: `/leaderboard`

Simple page with tabs:
- This Week (approved uploads in last 7 days)
- By Department (filter by department)
- All Time

Each entry shows: rank, avatar, name, points, badge count.

---

## Phase 5: Anti-Spam + Quality Control

- Duplicate detection using file hash (SHA-256 computed client-side) + file name + size
- Daily upload limit: 10 uploads per user per day (checked via count query)
- Required academic path enforcement (all fields must be filled)
- File size limit: 50MB (existing constraint)

---

## Additional Fixes (Included)

1. **Build error fix**: `send-waitlist-email/index.ts` line 167 - cast `error` to `Error` type
2. **Landing page redirect**: Add auth check in `LandingPage.tsx` - if user is logged in and has visited before (localStorage flag), redirect to `/dashboard`

---

## Files to Create
- `src/pages/CommunityUpload.tsx` - Upload wizard
- `src/pages/AdminUploads.tsx` - Admin moderation page
- `src/pages/Leaderboard.tsx` - Contributor leaderboard
- `src/components/ContributorBadges.tsx` - Badge display component
- `src/components/ContributorStats.tsx` - Profile contribution stats
- `src/hooks/useCommunityUploads.tsx` - Upload management hook
- `src/hooks/useContributorStats.tsx` - Contributor data hook

## Files to Modify
- `src/App.tsx` - New routes
- `src/pages/LandingPage.tsx` - Auth redirect logic
- `src/pages/UserProfile.tsx` - Contribution stats section
- `src/pages/AdminDashboard.tsx` - Sidebar link to uploads
- `src/components/SmartBottomNav.tsx` - Contribute entry point
- `src/components/FloatingActionButton.tsx` - Contribute entry point
- `supabase/functions/send-waitlist-email/index.ts` - Fix TS error
- Database: 3 new tables, 1 view, 3 functions, RLS policies

## Implementation Order
1. Fix build error + landing page redirect
2. Database migrations (tables, functions, RLS, view)
3. Upload wizard page
4. Moderation page (admin + rep)
5. Contributor stats + badges + leaderboard
6. Profile updates + entry points

This is a multi-message implementation. Shall I proceed with Phase 1?

