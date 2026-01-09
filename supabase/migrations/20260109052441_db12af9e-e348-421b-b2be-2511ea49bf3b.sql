-- Create a view to show profiles with readable campus info
CREATE VIEW public.profiles_readable 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.phone,
    c.code AS campus_code,
    c.name AS campus_name,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN public.campuses c ON c.id = p.campus_id
ORDER BY p.created_at DESC;