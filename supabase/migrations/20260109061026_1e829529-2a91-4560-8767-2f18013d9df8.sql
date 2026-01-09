-- Update existing pending orders with completed payment to confirmed
UPDATE public.orders 
SET status = 'confirmed' 
WHERE status = 'pending' AND payment_status = 'completed';