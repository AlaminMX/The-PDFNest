

## Plan: Cursor Animation on Landing Page + Rename Sidebar Label

### 1. Cursor-Responsive Animation on Landing Page

Create a `CursorFollower` component that renders small, semi-transparent PDF-themed icons (file icons / document shapes) that gently drift toward the cursor position with a lag/spring effect. This will be rendered as a full-page overlay on the landing page (pointer-events-none).

**Approach:**
- Track mouse position via `mousemove` on the landing page container
- Render 6-8 small floating SVG document/file icons at random initial positions
- Each icon follows the cursor with a different spring delay (creating a trailing effect)
- Use CSS transforms (no framer-motion for this — keep it lightweight with `requestAnimationFrame`)
- Icons are semi-transparent (`opacity-[0.06]` to `opacity-[0.12]`), subtle, not distracting
- Hide on mobile (touch devices) since there's no cursor
- Entire overlay is `pointer-events-none` and `fixed inset-0`

**Files:**
- Create `src/components/landing/CursorFollowEffect.tsx`
- Update `src/pages/LandingPage.tsx` to include it

### 2. Rename "AFIT Resources" → "Resources" in Sidebar

Simple text change in `src/pages/Index.tsx` line 219.

Also update `src/components/NavigationTutorial.tsx` line 81 for consistency.

