-- Simplify order_status enum - handle all dependencies properly
-- Step 1: Drop the blocking trigger
DROP TRIGGER IF EXISTS check_stock_on_order_confirmed ON public.orders;

-- Step 2: Remove the default constraint before altering type
ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;

-- Step 3: Convert the column to text temporarily
ALTER TABLE public.orders ALTER COLUMN status TYPE text USING status::text;

-- Step 4: Update existing orders to map old statuses to simplified ones
UPDATE public.orders SET status = 'confirmed' WHERE status IN ('preparing', 'ready');

-- Step 5: Drop the old enum type with CASCADE
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.order_status_new CASCADE;

-- Step 6: Create new simplified enum type (4 states for token system)
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'collected', 'cancelled');

-- Step 7: Convert column back to enum with new type
ALTER TABLE public.orders 
ALTER COLUMN status TYPE public.order_status 
USING status::public.order_status;

-- Step 8: Set default value back
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending'::public.order_status;

-- Step 9: Recreate the stock check trigger with updated logic
CREATE TRIGGER check_stock_on_order_confirmed
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed'::public.order_status AND OLD.status = 'pending'::public.order_status)
  EXECUTE FUNCTION public.update_stock_after_order();

-- Step 10: Add helpful comment documenting the simplified flow
COMMENT ON COLUMN public.orders.status IS 'Token-based order status: pending (awaiting payment verification), confirmed (payment verified - QR active), collected (scanned at counter), cancelled (payment rejected)';
