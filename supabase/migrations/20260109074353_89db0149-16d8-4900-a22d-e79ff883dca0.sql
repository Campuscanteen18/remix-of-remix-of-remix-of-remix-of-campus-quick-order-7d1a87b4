-- Ensure the campus_public_info view is accessible to anon users via the API
-- The GRANT was added but may need to be reapplied after view recreation

-- Re-grant SELECT permissions to ensure API access
GRANT SELECT ON public.campus_public_info TO anon;
GRANT SELECT ON public.campus_public_info TO authenticated;

-- Also grant usage on schema if not already done
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;