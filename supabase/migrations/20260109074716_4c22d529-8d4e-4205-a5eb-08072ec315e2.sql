-- Fix campus code lookup for unauthenticated users
-- campus_public_info was created with security_invoker=true, which causes RLS on campuses
-- to be evaluated as the caller (anon), returning 0 rows.
-- Since this view intentionally exposes ONLY non-sensitive campus fields, we can safely
-- make it run with the view owner's privileges so it can read active campuses.

ALTER VIEW public.campus_public_info SET (security_invoker = false);

-- Keep security_barrier enabled for defense-in-depth
ALTER VIEW public.campus_public_info SET (security_barrier = true);