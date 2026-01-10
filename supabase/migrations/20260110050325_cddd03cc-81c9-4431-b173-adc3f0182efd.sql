-- Schedule the cleanup function to run every hour
SELECT cron.schedule(
  'cleanup-old-orders',
  '0 * * * *',
  $$SELECT public.cleanup_old_orders();$$
);