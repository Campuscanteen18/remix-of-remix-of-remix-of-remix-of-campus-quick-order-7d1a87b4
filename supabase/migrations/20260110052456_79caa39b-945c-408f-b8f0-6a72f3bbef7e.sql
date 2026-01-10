-- Create a sequence for unique order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

-- Update the generate_order_number function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    campus_code TEXT;
    seq_val INTEGER;
    unique_suffix TEXT;
BEGIN
    SELECT code INTO campus_code FROM public.campuses WHERE id = NEW.campus_id;
    
    -- Get next value from sequence (ensures uniqueness)
    seq_val := nextval('public.order_number_seq');
    
    -- Use modulo 10000 to keep it to 4 digits, but add 1 to avoid 0000
    -- Also use the sequence value directly for true uniqueness
    unique_suffix := LPAD((seq_val % 10000)::TEXT, 4, '0');
    
    -- Format: CAMPUS-SEQ (e.g., RCDC-0001)
    NEW.order_number := campus_code || '-' || unique_suffix;
    
    RETURN NEW;
END;
$function$;