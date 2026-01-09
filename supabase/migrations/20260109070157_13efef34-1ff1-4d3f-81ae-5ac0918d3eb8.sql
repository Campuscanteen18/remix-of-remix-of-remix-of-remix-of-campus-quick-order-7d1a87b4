-- Create admin_pins table for secure server-side PIN storage
CREATE TABLE public.admin_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_sessions table for server-managed sessions
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_admin_sessions_user_token ON public.admin_sessions(user_id, session_token);
CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.admin_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies - only service role can access (edge functions use service role)
-- No direct client access allowed for security
CREATE POLICY "Service role only for admin_pins"
ON public.admin_pins
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role only for admin_sessions"  
ON public.admin_sessions
FOR ALL
USING (false)
WITH CHECK (false);

-- Add trigger for updated_at on admin_pins
CREATE TRIGGER update_admin_pins_updated_at
BEFORE UPDATE ON public.admin_pins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup job: Delete expired sessions (can be run periodically)
-- This creates a function that can be called to clean up
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.admin_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;