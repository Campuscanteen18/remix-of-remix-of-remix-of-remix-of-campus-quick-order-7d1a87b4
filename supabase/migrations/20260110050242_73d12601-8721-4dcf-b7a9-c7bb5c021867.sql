-- Enable required extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to delete orders older than 48 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- First delete order_items for old orders
  DELETE FROM public.order_items
  WHERE order_id IN (
    SELECT id FROM public.orders 
    WHERE created_at < now() - INTERVAL '48 hours'
  );
  
  -- Then delete the old orders
  DELETE FROM public.orders 
  WHERE created_at < now() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG 'Cleanup: Deleted % orders older than 48 hours', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_orders() TO service_role;