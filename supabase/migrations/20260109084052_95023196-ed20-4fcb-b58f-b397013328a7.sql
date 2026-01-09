-- Drop the existing restrictive INSERT policy on orders
DROP POLICY IF EXISTS "Users can create orders at their campus" ON public.orders;

-- Create new policy: Any authenticated user can create orders at ANY active campus
-- This enables "Student Roaming" - students can order at any campus they visit
CREATE POLICY "Users can create orders at any active campus"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated and the order must be for themselves
  user_id = auth.uid()
  -- Campus must be active
  AND EXISTS (
    SELECT 1 FROM public.campuses 
    WHERE campuses.id = orders.campus_id 
    AND campuses.is_active = true
  )
);