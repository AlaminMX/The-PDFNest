

# Fix Forgot-Password Flow

## Root Cause

The password reset email link may not land on `/reset-password` due to Supabase's redirect URL allowlist. When the recovery token ends up on `/` or `/auth` instead, the existing `getSession()` call in `Auth.tsx` (line 38-48) finds a valid session and immediately redirects to `/dashboard` — before the `PASSWORD_RECOVERY` event even fires. The user gets logged in instead of seeing the reset form.

Even when the redirect works correctly, there's a race condition: `getSession()` can resolve with the recovery session before `onAuthStateChange` fires `PASSWORD_RECOVERY`, causing the redirect to `/dashboard` to win.

## Fix Strategy

### 1. Configure Auth Redirect URLs
Use `configure_auth` to add `https://pdfnest.lovable.app/reset-password` (and the preview URL equivalent) to the allowed redirect URLs so Supabase honors the `redirectTo` parameter.

### 2. Add Global Recovery Interceptor (`src/components/RecoveryRedirect.tsx`) — NEW FILE
A small component mounted in `App.tsx` (above `<Routes>`) that checks on every render if the current URL contains recovery hash params (`type=recovery` or `access_token` in hash). If detected and the user is NOT already on `/reset-password`, it immediately navigates to `/reset-password` (carrying the hash). This ensures that even if Supabase redirects to the wrong page, the user always ends up on the reset form.

### 3. Fix `Auth.tsx` Race Condition
In the `getSession()` check (lines 38-48), add a guard: if the URL contains recovery params (`type=recovery` in hash or `code` in query), skip the dashboard redirect and let the `PASSWORD_RECOVERY` handler (or the global interceptor) handle routing.

### 4. Fix `useAuth.tsx` Interference
In the `onAuthStateChange` handler, add a guard: if the current path is `/reset-password`, do NOT navigate away on `SIGNED_IN`. This prevents the dashboard hook from competing with the reset page.

## Files Changed
- `src/components/RecoveryRedirect.tsx` — **NEW** — global recovery URL interceptor
- `src/App.tsx` — mount `RecoveryRedirect` inside `BrowserRouter`
- `src/pages/Auth.tsx` — guard `getSession` redirect against recovery params
- `src/hooks/useAuth.tsx` — guard `SIGNED_IN` navigation when on `/reset-password`

## No Database Changes
No migrations, no edge functions, no env changes needed.

