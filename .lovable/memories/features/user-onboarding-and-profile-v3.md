---
name: User Onboarding v4 (3-step)
description: Post-auth /onboarding wizard captures faculty, department, level on first login
type: feature
---
Onboarding now lives at `/onboarding` (separate from Auth):
- Trigger: `routeAfterAuth()` in `src/pages/Auth.tsx` checks `profiles.onboarding_complete`; if false → `/onboarding`, else `/dashboard`. Same check is enforced inside `Onboarding.tsx`.
- 3 steps: faculty → department (filtered by faculty_id) → level (100/200/300/400/500).
- Dark dot-grid background, top progress bar, `01/03` mono counter, "Skip for now" link still sets `onboarding_complete = true`.
- Existing users were backfilled to `onboarding_complete = true` in migration `20260608*_profiles_onboarding`.
- Auth page is now plain email/password (signup + login). The legacy 5-step `SignupWizard` and `src/components/signup/*` files were removed.
- `profiles` columns used: `faculty_id`, `department_id`, `level`, `onboarding_complete`.
