

## Plan: PDFNest Waitlist, Profile Fixes, Home UI, and More

This is a large multi-item request. Here is the implementation plan across 10 items.

---

### Pre-requisite: Resend API Key for Bulk Email

The bulk email feature (item 3) requires an email sending service. There are no email connectors available in the workspace. I will need to ask you to provide a **Resend API key** as a secret before the bulk email edge function can work. The waitlist table and admin UI can be built immediately; the email sending will need the key.

---

### 1. School Store Waitlist Form

**Database**: Create `store_waitlist` table with columns: `id` (uuid), `name` (text), `email` (text), `whatsapp_number` (text), `created_at` (timestamptz). RLS: authenticated users can insert their own rows; admins can select all.

**File**: `src/pages/SchoolStore.tsx`
- Add 3 input fields (Name, Email, WhatsApp) above the CTA button
- Validate email format and WhatsApp number (digits, 7-15 chars)
- Insert into `store_waitlist` on submit
- Show loading spinner, success toast, error toast
- Disable button during submission

### 2. Admin Waitlist Page

**New file**: `src/pages/AdminWaitlist.tsx`
- Table displaying all waitlist entries (name, email, WhatsApp, date)
- Search/filter by name or email
- Mobile responsive with horizontal scroll or card layout

**Modified files**:
- `src/App.tsx` — add route `/admin/waitlist`
- `src/pages/AdminDashboard.tsx` — add "Waitlist" to `sidebarItems`

### 3. Admin Bulk Email to Waitlist

**New edge function**: `supabase/functions/send-waitlist-email/index.ts`
- Accepts subject + body from admin
- Fetches all waitlist emails from DB
- Sends via Resend API (loops through recipients)
- Includes PDFNest logo in email HTML
- Returns success/failure count

**Secret needed**: `RESEND_API_KEY` — I will prompt you to add this.

**UI in `AdminWaitlist.tsx`**:
- "Send Email to All" button opens a compose dialog (subject + rich body textarea)
- Confirmation dialog before sending
- Button disabled during send, shows success/error after
- Handles empty waitlist gracefully

### 4. Sidebar Files Collapsed by Default

**File**: `src/pages/Index.tsx`
- Change `filesSectionOpen` initial state from `true` to `false` (line 170)

### 5. Grid View Default + One-Time Popup

**File**: `src/pages/Index.tsx`
- Change default `viewMode` from `"list"` to `"grid"` (line 516-518): only apply `"grid"` default when no localStorage value exists
- Add a one-time popup/tooltip near the view toggle (`#view-toggle`) that says "Switch between Grid and List view using the toggle in the top-right corner"
- Dismissed via localStorage key `pdfnest-view-hint-${userId}`
- Small, non-intrusive toast-like hint or popover pointing to the toggle area

### 6. Edit Profile Modal Fix

**File**: `src/components/EditProfileModal.tsx`
- Add props for `currentNickname`, `currentPhoneNumber`, `currentFullName`
- Add state + input fields for: Full Name, Nickname, Phone Number
- Include all in the update payload to `profiles` table
- Avatar upload already works via `AvatarUpload` component

**File**: `src/pages/UserProfile.tsx`
- Fetch additional profile fields (nickname, phone_number, full_name) — currently uses RPC which doesn't return these
- Pass new props to `EditProfileModal`
- The "blank page" issue needs investigation — likely the modal renders but profile data isn't passed correctly; will ensure data is always available before opening

### 7. Offline PDF Preview Fix

**File**: `src/pages/Index.tsx` (preview handler)
- When user clicks preview on an offline-cached file, check IndexedDB for the cached blob first
- Create an object URL from the cached blob and pass it to the PDF viewer
- Currently the preview likely uses a signed URL that fails when offline

**File**: `src/components/PDFViewer.tsx`
- Already has offline-first logic (checks `getCachedPDF(fileId)`) — verify this path works
- The `SimplePDFPreview` component does NOT have offline support — it just opens a URL. Need to route offline files through `PDFViewer` instead

### 8. School Store Tile Layout on AFIT PDFs Page

**File**: `src/pages/FacultySelection.tsx`
- Move the School Store tile outside the 2-column grid
- Make it span full width (col-span-2 equivalent)
- Reduce height, keep visual appeal
- Place it below the faculty grid

### 9. Admin Dashboard — Show Age, Usage Reason, Department

**File**: `src/pages/AdminDashboard.tsx`
- `UserData` interface already has `usageReason` but not `age`
- Add `age` to `UserData` interface and fetch it in `fetchAllUsers`
- Add "Age" and "Usage Reason" columns to the table (hidden on small screens, visible on xl+)
- Department column already exists at `lg:table-cell` — change to `md:table-cell` for better mobile visibility

**File**: `src/pages/AdminUserDetail.tsx`
- Already fetches `age`, `usage_reason` — verify they display in the user detail card

### 10. Testing & Stability

All changes will be verified for:
- No console errors
- No broken routes
- Mobile responsiveness preserved
- No regressions

---

### Summary of Files Modified

| # | Change | Files |
|---|--------|-------|
| 1 | Waitlist form | `SchoolStore.tsx`, DB migration |
| 2 | Admin waitlist page | New `AdminWaitlist.tsx`, `App.tsx`, `AdminDashboard.tsx` |
| 3 | Bulk email | New edge function, `AdminWaitlist.tsx`, secret request |
| 4 | Sidebar collapsed | `Index.tsx` (1 line) |
| 5 | Grid default + popup | `Index.tsx` |
| 6 | Edit profile fix | `EditProfileModal.tsx`, `UserProfile.tsx` |
| 7 | Offline preview | `Index.tsx` preview handler |
| 8 | Store tile layout | `FacultySelection.tsx` |
| 9 | Admin user fields | `AdminDashboard.tsx` |

### Database Changes
- New table: `store_waitlist` with RLS policies

### Secret Required
- `RESEND_API_KEY` for bulk email sending (item 3)

