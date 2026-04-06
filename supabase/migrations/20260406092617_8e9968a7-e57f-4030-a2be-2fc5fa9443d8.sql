
-- 1) Add user_id column to store_waitlist
ALTER TABLE public.store_waitlist ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows as NULL (they'll remain, admin-visible only)

-- 2) Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert waitlist entries" ON public.store_waitlist;

-- 3) Create a new INSERT policy that binds user_id to auth.uid()
CREATE POLICY "Authenticated users can insert own waitlist entries"
ON public.store_waitlist
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) Fix courses INSERT policy to bind suggested_by to auth.uid()
DROP POLICY IF EXISTS "Users can suggest new courses" ON public.courses;

CREATE POLICY "Users can suggest new courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (status = 'pending' AND suggested_by = auth.uid());
