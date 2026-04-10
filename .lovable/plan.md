

# Department Leaderboard + Badge Celebration System

## Summary
Upgrade the existing contributor system with a monthly department leaderboard, badge celebration animations, and expanded profile badge display. All ranking is based on approved uploads only (already enforced by existing DB functions).

## Changes

### 1. Leaderboard Page Overhaul (`src/pages/Leaderboard.tsx`)
- Replace "All Time / By Department" tabs with **"My Department / All Departments"** tabs
- Default to user's own department (auto-detect via `useUserDepartment`)
- Add department switcher (Select dropdown) visible in both tabs
- Change banner text to "Monthly Leaderboard" with current month/year
- **Hide raw points** from the UI — show only "X approved uploads" and rank
- Add badge indicators (small emoji chips) next to usernames for earned badges
- Highlight the current user's row with a distinct background color
- Filter: only show users with `approved_count >= 1`
- Add "Monthly #1" badge indicator for the top-ranked user

### 2. Monthly Leaderboard Logic (`src/hooks/useContributorStats.tsx`)
- The existing `contributor_leaderboard` view uses `contributor_points.total_points` which is all-time
- For monthly ranking, the `useLeaderboard` hook will query `community_uploads` directly, counting approved uploads within the current month (`reviewed_at >= start of month`)
- New function: `useMonthlyLeaderboard(departmentId?)` that:
  - Queries `community_uploads` WHERE `status = 'approved'` AND `reviewed_at >= firstDayOfMonth`
  - Groups by `user_id`, counts approved uploads
  - Joins with `profiles` for display name, avatar, department
  - Orders by count DESC
  - Filters by department if provided
- Keep existing `useLeaderboard` for backward compatibility but the Leaderboard page will use the new monthly hook

### 3. Rank Click on Profile (`src/components/ContributorStats.tsx`)
- Make the "Dept. Rank" tile clickable → navigates to `/leaderboard`
- Add cursor-pointer and hover effect to the rank tile

### 4. Badge Celebration Component (`src/components/BadgeCelebration.tsx`)
- New component: animated dialog/modal that appears when a new badge is detected
- Uses existing `Confetti` component for particle effects
- Shows: badge emoji (large, animated scale-in), badge name, description, "View on Profile" CTA
- Framer Motion animations: scale-in for badge icon, fade-in for text
- Detection logic: on the profile/dashboard, compare `badges` from hook against a localStorage key `pdfnest-seen-badges`. If new badges found, trigger celebration for the first unseen one, then mark as seen
- "View on Profile" navigates to `/profile` and scrolls to contributions section

### 5. Badge Celebration Integration (`src/pages/Index.tsx` or `src/components/SmartBottomNav.tsx`)
- Add `BadgeCelebration` component to the main dashboard layout so it triggers globally after login
- It checks for new badges on mount, shows celebration once per new badge

### 6. Expanded Badge Display on Profile (`src/components/ContributorBadges.tsx`)
- Already supports `showLocked` prop — no changes needed here
- Add a new badge type to `BADGE_CONFIG`: `monthly_champion` with label "Monthly #1", description "Ranked #1 in your department for a month", emoji "👑"

### 7. Profile Badge Section (`src/components/ContributorStats.tsx`)
- Already renders `<ContributorBadges badges={badges} showLocked size="sm" />` — this already shows locked/unlocked states
- No structural changes needed, just ensure `showLocked` is `true` (already is)

### 8. Leaderboard Row UI Updates (`src/pages/Leaderboard.tsx`)
- Remove `total_points` display from each row
- Show "X uploads" as the primary metric
- Add small badge chips next to display name for earned badges
- Current user row: `bg-primary/10 border-l-2 border-primary` styling

## Files Modified
- `src/pages/Leaderboard.tsx` — overhaul UI, monthly scope, department auto-select, hide points
- `src/hooks/useContributorStats.tsx` — add `useMonthlyLeaderboard` hook
- `src/components/ContributorStats.tsx` — make rank tile clickable
- `src/components/ContributorBadges.tsx` — add `monthly_champion` badge config
- `src/components/BadgeCelebration.tsx` — **new** celebration modal component
- `src/pages/Index.tsx` — mount `BadgeCelebration` on dashboard

## Files NOT Modified
- No database migrations needed — monthly ranking is computed from existing `community_uploads.reviewed_at`
- No edge functions needed
- No changes to existing approval/rejection RPCs (they already correctly update points/badges)

## Technical Details
- Monthly leaderboard query: `SELECT user_id, COUNT(*) as monthly_uploads FROM community_uploads WHERE status = 'approved' AND reviewed_at >= date_trunc('month', now()) GROUP BY user_id ORDER BY monthly_uploads DESC`
- Badge celebration uses localStorage `pdfnest-seen-badges` (JSON array of badge_types) to avoid repeat celebrations
- Current user detection via `supabase.auth.getUser()` in the leaderboard page
- All existing functionality preserved — no route changes, no schema changes

