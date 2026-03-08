

## Plan: Fix AI Features, Bottom Nav, and Sidebar Restructure

### Three Issues to Address

---

### 1. AI Features Page — File Picker Not Showing

**Root cause:** In `AIFeatures.tsx`, `handleFeatureClick` checks `files.length === 0` and redirects to `/dashboard?upload=true`. But `usePDFFiles(user?.id)` loads files asynchronously — if the user clicks a feature before files finish loading, `files` is still an empty array, triggering the redirect.

**Fix:** Check `filesLoading` before evaluating `files.length`. If still loading, wait or show a loading state. Only redirect if loading is complete AND files are truly empty.

---

### 2. Bottom Nav — Show All 4 Tabs Always

**Root cause:** `BottomNav.tsx` conditionally adds Notifications and Profile tabs only when `isLoggedIn && userId` is truthy. For guests (or before auth loads), only Home and AI Features appear.

**Fix:** Always render all 4 tabs. For guests, tapping Notifications or Profile will navigate to `/auth` instead. This ensures the nav looks consistent and works offline.

---

### 3. Sidebar Layout Restructure

Reorganize `AppSidebar` in `Index.tsx` to follow the requested hierarchy:

```text
AFIT Resources
  └ AFIT PDFs

Admin Tools          (admin only)
  └ Reps Profile

Recent Files         (collapsible)

Favorites            (standalone item, not inside Files)

Files                (collapsible)
  └ All Files (count)

Categories           (collapsible, separate from Files)
  └ Uncategorized
  └ School Stuff
  └ Finance
  └ ...
  └ + New Category
```

**Typography levels:**
- Level 1 (section headers like "AFIT Resources", "Files"): larger, bold, uppercase
- Level 2 (sub-sections like "Admin Tools", "Recent Files", "Categories"): medium weight
- Level 3 (individual items): normal weight

**Spacing:** Clear separator lines between major groups.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AIFeatures.tsx` | Guard `files.length === 0` check with `filesLoading` |
| `src/components/BottomNav.tsx` | Always show all 4 tabs; guest taps on Notifications/Profile go to `/auth` |
| `src/pages/Index.tsx` | Restructure `AppSidebar` sections, typography, and spacing per spec |

