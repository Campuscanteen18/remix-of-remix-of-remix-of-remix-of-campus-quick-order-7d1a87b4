-- Create prepaid_tokens table
CREATE TABLE public.prepaid_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  qr_code TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create sequence for token numbers
CREATE SEQUENCE public.prepaid_token_number_seq START 1;

-- Enable RLS
ALTER TABLE public.prepaid_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: Users can create tokens at active campuses
CREATE POLICY "Users can create prepaid tokens"
ON public.prepaid_tokens
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (SELECT 1 FROM public.campuses WHERE id = campus_id AND is_active = true)
);

-- Users can view their own tokens
CREATE POLICY "Users can view own prepaid tokens"
ON public.prepaid_tokens
FOR SELECT
USING (user_id = auth.uid());

-- Campus admins/kiosk can view campus tokens
CREATE POLICY "Campus admins can view campus prepaid tokens"
ON public.prepaid_tokens
FOR SELECT
USING (
  campus_id = get_user_campus_id(auth.uid()) 
  AND (is_campus_admin(auth.uid()) OR has_role(auth.uid(), 'kiosk'))
);

-- Campus admins/kiosk can update campus tokens (mark as used)
CREATE POLICY "Campus admins can update campus prepaid tokens"
ON public.prepaid_tokens
FOR UPDATE
USING (
  campus_id = get_user_campus_id(auth.uid()) 
  AND (is_campus_admin(auth.uid()) OR has_role(auth.uid(), 'kiosk'))
);

-- Function to generate token number and QR code
CREATE OR REPLACE FUNCTION public.generate_prepaid_token_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campus_code TEXT;
  seq_val INTEGER;
BEGIN
  -- Get campus code
  SELECT code INTO campus_code FROM public.campuses WHERE id = NEW.campus_id;
  
  -- Get next sequence value
  seq_val := nextval('public.prepaid_token_number_seq');
  
  -- Generate token number: PT-CAMPUSCODE-YYMMDD-XXXX
  NEW.token_number := 'PT-' || COALESCE(campus_code, 'XX') || '-' || to_char(now(), 'YYMMDD') || '-' || LPAD((seq_val % 10000)::TEXT, 4, '0');
  
  -- Generate QR code value
  NEW.qr_code := 'PREPAID:' || NEW.id::TEXT;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_prepaid_token_details
BEFORE INSERT ON public.prepaid_tokens
FOR EACH ROW
EXECUTE FUNCTION public.generate_prepaid_token_details();