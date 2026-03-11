
-- Create store_waitlist table
CREATE TABLE public.store_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_waitlist ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert waitlist entries"
  ON public.store_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all waitlist entries
CREATE POLICY "Admins can view all waitlist entries"
  ON public.store_waitlist
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist entries"
  ON public.store_waitlist
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
