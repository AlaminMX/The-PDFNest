## Plan: PDFNest Updates - Signup DOB, Profile Fixes, Email Debugging, and More

This covers 10 items. Most infrastructure (waitlist table, admin page, sidebar/grid defaults, store tile layout) is already implemented. The new work focuses on signup flow changes (Age to Date of Birth), profile modal enhancements, email debugging, and admin dashboard field updates.

---

### Database Changes

**Migration: Add `date_of_birth` column to `profiles**`

```sql
ALTER TABLE public.profiles ADD COLUMN date_of_birth date;
```

The existing `age` column will be kept for backward compatibility but no longer populated during signup.

---

### 1. School Store Waitlist Form -- Already Implemented

The waitlist form with Name, Email, WhatsApp fields, Zod validation, loading/success/error states is already in `SchoolStore.tsx`. No changes needed.

### 2. Admin Waitlist Page -- Already Implemented

`AdminWaitlist.tsx` with table, search, mobile cards exists. No changes needed.

### 3. Bulk Email -- Fix Root Cause

The edge function exists and looks correct. The likely failure cause is **Resend free tier restriction**: the `from` address `onboarding@resend.dev` can only send to the Resend account owner's email address. To send to arbitrary recipients, you need a verified custom domain in your Resend dashboard.

**Action items:**

- Add `send-waitlist-email` to `supabase/config.toml` with `verify_jwt = true` (for explicit declaration)
- The edge function code itself is correct - no code changes needed
- **User action required**: In Resend dashboard, add and verify a custom domain, then update the `from` field in the edge function from `"PDFNest <onboarding@resend.dev>"` to `"PDFNest <noreply@yourdomain.com>"`

### 4. Sidebar Files Collapsed -- Already Implemented

`filesSectionOpen` is already `false` on line 170 of `Index.tsx`.

### 5. Grid View Default + Popup -- Already Implemented

View mode defaults to `"grid"`, one-time hint popup exists. No changes needed.

### 6. Signup Flow Corrections

**Files modified:**

- `src/components/signup/SignupWizard.tsx`
  - Replace `age: string` with `dateOfBirth: string` in `SignupData` interface and `initialData`
  - In `getResolvedProfileData()`: replace `age` logic with `date_of_birth: data.dateOfBirth || null`
  - Set `display_name` and `nickname` both from the same source (nickname field or fullName)
- `src/components/signup/StepPreferences.tsx`
  - Replace the Age input with a Date of Birth date picker using the Shadcn Calendar/Popover pattern
  - Remove the Nickname field (it's redundant with Display Name from StepAccountBasics)
  - The "Nickname" concept maps to `display_name` which is set from `fullName` in step 1
- `src/components/signup/StepAccountBasics.tsx`
  - Add a "Display Name / Nickname" field after Full Name (optional, defaults to full name)
  - This becomes the single source for both `display_name` and `nickname` in the profile

### 7. Edit Profile Modal -- Fix + Add Date of Birth

**File: `src/components/EditProfileModal.tsx**`

- Remove the separate "Nickname" field since Display Name = Nickname
- Rename "Display Name" label to "Display Name / Nickname"
- Add Date of Birth picker using Shadcn Calendar/Popover
- Save `date_of_birth` to profiles table
- Save `nickname` = `display_name` (keep them synced)
- The blank page issue was already fixed (the `SelectItem value=""` error was resolved)
- Add Date of Birth to the sign up flow in place of "Age"

**File: `src/pages/UserProfile.tsx**`

- Fetch `date_of_birth` in the extra fields query
- Pass `currentDateOfBirth` to `EditProfileModal`
- Add `date_of_birth` to `UserProfileData` interface

### 8. Offline Preview -- Already Implemented

The `handleOpenPreview` in `Index.tsx` already checks `getCachedPDF` from IndexedDB and creates object URLs. `PDFViewer.tsx` also has offline-first logic. No changes needed.

### 9. Store Tile Layout -- Already Implemented

The School Store tile in `FacultySelection.tsx` already spans full width below the grid. No changes needed.

### 10. Admin Dashboard -- Replace Age with Date of Birth, Add Phone Number

**File: `src/pages/AdminDashboard.tsx**`

- Add `phoneNumber` and `dateOfBirth` to `UserData` interface
- Fetch `phone_number` and `date_of_birth` in `fetchAllUsers`
- Replace "Age" column header with "DOB" (Date of Birth)
- Add "Phone" column
- Display formatted date of birth instead of age integer

**File: `src/pages/AdminUserDetail.tsx**`

- Add `date_of_birth` and `phone_number` to `UserProfile` interface
- Fetch and display these fields in the user detail view
- Replace Age display with Date of Birth

---

### Summary of Files to Modify


| File                                          | Changes                                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| `src/components/signup/SignupWizard.tsx`      | Replace `age` with `dateOfBirth`, unify nickname/display_name |
| `src/components/signup/StepPreferences.tsx`   | Date of Birth picker replaces Age, remove Nickname            |
| `src/components/signup/StepAccountBasics.tsx` | Add Display Name / Nickname field                             |
| `src/components/EditProfileModal.tsx`         | Add DOB picker, unify nickname/display_name fields            |
| `src/pages/UserProfile.tsx`                   | Fetch DOB, pass to modal                                      |
| `src/pages/AdminDashboard.tsx`                | Show DOB, phone, replace age column                           |
| `src/pages/AdminUserDetail.tsx`               | Show DOB, phone in detail view                                |
| `supabase/config.toml`                        | Add send-waitlist-email entry                                 |
| DB migration                                  | Add `date_of_birth` column                                    |


### Items Already Working (No Changes)

- School Store waitlist form (items 1)
- Admin Waitlist page (item 2)
- Sidebar collapsed default (item 4)
- Grid view default + popup (item 5)
- Offline preview (item 8)
- Store tile layout (item 9)

### User Action Required

- **Resend domain verification**: The bulk email feature requires a verified domain in Resend to send to arbitrary recipients. The free `onboarding@resend.dev` sender only delivers to the account owner's email.