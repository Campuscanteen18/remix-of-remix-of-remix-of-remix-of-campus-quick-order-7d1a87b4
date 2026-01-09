-- Fix critical security issue: Payment credentials exposed in campuses table
-- The public "Anyone can view active campuses" policy exposes settings JSONB containing payment secrets

-- Step 1: Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view active campuses" ON public.campuses;

-- Step 2: Create a secure public view with only non-sensitive fields
-- This view excludes the settings column entirely from public access
CREATE OR REPLACE VIEW public.campus_public_info 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
    id,
    name,
    code,
    address,
    logo_url,
    is_active,
    -- Only expose safe branding settings for theming
    (settings->'branding') as branding,
    -- Only expose safe operational settings (currency display, etc.)
    jsonb_build_object(
        'currency', settings->'operational'->'currency',
        'tax_rate', settings->'operational'->'tax_rate',
        'service_charge', settings->'operational'->'service_charge'
    ) as public_operational_settings
FROM public.campuses 
WHERE is_active = true;

-- Step 3: Grant SELECT on the public view to anon and authenticated roles
GRANT SELECT ON public.campus_public_info TO anon, authenticated;

-- Step 4: Add new restrictive policy for full campuses table access
-- Only authenticated users from the same campus OR admins can see full data
CREATE POLICY "Users can view their own campus full data"
ON public.campuses
FOR SELECT
TO authenticated
USING (
    id = get_user_campus_id(auth.uid())
);

-- Step 5: Ensure super admins can still manage all campuses (already exists but verify)
-- The existing "Super admins can manage all campuses" policy handles this

-- Note: The campus_public_info view is now the ONLY way for unauthenticated users
-- to access campus information, and it does NOT include payment credentials