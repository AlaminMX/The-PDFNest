

## Fix Plan: Build Errors, Google Auth, Light Theme, Storage Sync

### 1. Fix Build Errors (5 files)

**`src/components/signup/SignupWizard.tsx` (line 105)**
- Remove `financial_literacy_interest: data.financialLiteracyInterest` from the profile payload — field no longer exists in `SignupData`

**`src/pages/Auth.tsx` (line 212)**
- `logActivity` is not imported. Add dynamic import: `const { logActivity } = await import("@/lib/sessionLogger");` before the call

**`src/pages/AdminUserDetail.tsx` (line 89)**
- Add missing state: `const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);`
- Line 224-225: Remove the `confirm()` call (now using AlertDialog), just check `if (isDeletingAccount || !userId) return;`

**`src/pages/AdminSessionLogs.tsx` (lines 108-134)**
- Remove calls to nonexistent RPCs (`get_admin_activity_events`, `get_admin_failed_login_events`, `get_admin_activity_sessions`)
- Replace with direct table queries:
  - `supabase.from("user_activity_logs").select("id, activity_type, details, created_at, user_id").order("created_at", {ascending: false}).limit(1000)`
  - `supabase.from("user_sessions").select("id, user_id, started_at, ended_at, is_active").order("started_at", {ascending: false}).limit(300)`
- Map rows to the existing `ActivityEvent`, `SessionSummary`, `FailedLoginEvent` interfaces
- Filter failed logins from activity logs where `activity_type === "login_failed"`

### 2. Fix Google Sign-In in SignupWizard

**`src/components/signup/SignupWizard.tsx` (lines 149-155)**
- Replace `supabase.auth.signInWithOAuth({provider: "google", ...})` with:
  ```ts
  const { lovable } = await import("@/integrations/lovable/index");
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result?.error) throw result.error;
  ```
- Auth.tsx login page already uses Lovable Cloud — no change needed there

### 3. Fix Light Theme (DO NOT touch `.dark` block)

**`src/index.css`**

a) Remove duplicate `--background`/`--foreground` on lines 9-10 (dark values leaking into `:root`)

b) Fix sidebar light theme variables (lines 35-43) — currently set to dark colors:
```css
--sidebar-background: 220 16% 96%;
--sidebar-foreground: 222 47% 11%;
--sidebar-primary: 0 84% 51%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 214 20% 90%;
--sidebar-accent-foreground: 222 47% 11%;
--sidebar-border: 214 25% 84%;
--sidebar-ring: 0 84% 51%;
```

c) Fix `body` class (line 142): Replace `bg-[#212121]` with `bg-background` so it respects theme

**`src/pages/Index.tsx` (line 193)**
- Change `text-white/70` to `text-sidebar-foreground/70` for the "Smart PDF Manager" subtitle

### 4. Unify Storage Size

**`src/pages/Index.tsx` (line 815)**
- Replace `files.reduce((total, file) => total + (file.file_size || 0), 0)` with a React Query that fetches `profiles.total_storage_used` from the database (same source as UserProfile page)
- Add `import { useQuery } from "@tanstack/react-query"` at top
- Query: `supabase.from("profiles").select("total_storage_used").eq("id", user.id).maybeSingle()`
- This ensures sidebar and profile page show identical values

### Files Modified
- `src/components/signup/SignupWizard.tsx` — remove dead field, fix Google OAuth
- `src/pages/Auth.tsx` — fix missing import
- `src/pages/AdminUserDetail.tsx` — add missing state variable, remove confirm()
- `src/pages/AdminSessionLogs.tsx` — replace nonexistent RPCs with direct table queries
- `src/pages/Index.tsx` — fix storage source, fix sidebar text color, add useQuery import
- `src/index.css` — fix light theme sidebar variables, remove duplicate dark values, fix body bg

### Risk
- Dark theme is NOT modified — only `:root` (light) and body class changed
- Storage value now matches profile page exactly
- Session logs now query existing tables instead of missing RPCs

