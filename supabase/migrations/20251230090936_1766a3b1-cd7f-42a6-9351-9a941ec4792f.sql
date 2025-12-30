-- Create user_sessions table for session-based logging
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  logout_at timestamp with time zone,
  duration_seconds integer,
  is_active boolean NOT NULL DEFAULT true,
  user_agent text,
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_at ON public.user_sessions(login_at DESC);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);