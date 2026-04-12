

# Fix: Protected Route 404 + SPA Routing

## Bug 1 — ProtectedRoute shows content before auth check completes

**Root cause:** `ProtectedRoute` renders `{children}` unconditionally on line 24 while `getSession()` is still pending. The child page tries to render, often fails (no user data), and the user sees a broken/404 state before the redirect fires.

**Fix:** Add `checking` and `isAuthenticated` state to `ProtectedRoute.tsx`. Return `null` while checking, redirect if no session, render children only when authenticated. This mirrors the pattern already used in `AuthGate.tsx`.

Auth.tsx already correctly reads `redirectAfterLogin` from sessionStorage on both `getSession` (line 47-50) and `SIGNED_IN` event (line 76-79). No changes needed there.

## Bug 2 — SPA routing on Vercel/custom domain

**Fix:** Create `vercel.json` at project root with SPA rewrite rule.

## Files Changed

1. **`src/components/ProtectedRoute.tsx`** — Add loading/auth state, render nothing until session is confirmed, redirect to `/auth` if unauthenticated
2. **`vercel.json`** — NEW FILE — SPA catch-all rewrite for Vercel hosting

No other files touched.

