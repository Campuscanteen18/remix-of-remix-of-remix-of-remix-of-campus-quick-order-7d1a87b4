-- Create a function to delete orders older than 48 hours
CREATE OR REPLACE FUNCTION public.cleanup_orders_older_than_48h()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- First delete order items for old orders
  DELETE FROM public.order_items
  WHERE order_id IN (
    SELECT id FROM public.orders 
    WHERE created_at < (NOW() - INTERVAL '48 hours')
  );
  
  -- Then delete the old orders
  WITH deleted AS (
    DELETE FROM public.orders
    WHERE created_at < (NOW() - INTERVAL '48 hours')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users (admins will call this)
GRANT EXECUTE ON FUNCTION public.cleanup_orders_older_than_48h() TO authenticated;