-- Drop the prepaid tokens table and related objects
DROP TRIGGER IF EXISTS set_prepaid_token_details ON public.prepaid_tokens;
DROP FUNCTION IF EXISTS public.generate_prepaid_token_details();
DROP TABLE IF EXISTS public.prepaid_tokens;
DROP SEQUENCE IF EXISTS public.prepaid_token_number_seq;