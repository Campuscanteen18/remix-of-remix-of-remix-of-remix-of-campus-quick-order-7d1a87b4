-- Create a view to show user roles with readable campus and user info
CREATE VIEW public.user_roles_readable AS
SELECT 
    ur.id,
    ur.user_id,
    p.full_name,
    p.email,
    ur.role,
    c.code AS campus_code,
    c.name AS campus_name,
    ur.created_at
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.user_id = ur.user_id
LEFT JOIN public.campuses c ON c.id = ur.campus_id
ORDER BY ur.created_at DESC;