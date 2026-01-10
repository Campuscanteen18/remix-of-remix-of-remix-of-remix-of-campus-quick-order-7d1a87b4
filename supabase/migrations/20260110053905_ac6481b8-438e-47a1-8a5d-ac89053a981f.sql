-- Create a function to update stock when orders are placed
CREATE OR REPLACE FUNCTION public.update_stock_after_order()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  current_stock INTEGER;
  total_ordered INTEGER;
BEGIN
  -- For each item in the order, check and update stock
  FOR item_record IN 
    SELECT menu_item_id, quantity FROM public.order_items WHERE order_id = NEW.id
  LOOP
    IF item_record.menu_item_id IS NOT NULL THEN
      -- Get the current stock quantity for this menu item
      SELECT stock_quantity INTO current_stock
      FROM public.menu_items
      WHERE id = item_record.menu_item_id;
      
      -- Only process if stock_quantity is set (not null - meaning stock tracking is enabled)
      IF current_stock IS NOT NULL THEN
        -- Calculate total ordered quantity for this item (from confirmed/preparing/ready orders)
        SELECT COALESCE(SUM(oi.quantity), 0) INTO total_ordered
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.menu_item_id = item_record.menu_item_id
          AND o.status IN ('confirmed', 'preparing', 'ready')
          AND o.payment_status = 'completed';
        
        -- If total ordered >= stock, mark as unavailable (sold out)
        IF total_ordered >= current_stock THEN
          UPDATE public.menu_items
          SET is_available = false, updated_at = now()
          WHERE id = item_record.menu_item_id;
          
          RAISE LOG 'Item % marked as sold out. Stock: %, Ordered: %', 
            item_record.menu_item_id, current_stock, total_ordered;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after order status is updated to confirmed
CREATE OR REPLACE TRIGGER check_stock_on_order_confirmed
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'confirmed' AND NEW.payment_status = 'completed')
EXECUTE FUNCTION public.update_stock_after_order();

-- Also create a function to reset stock counts (for admin use - resets availability when stock is replenished)
CREATE OR REPLACE FUNCTION public.reset_item_stock(item_id UUID, new_stock INTEGER DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.menu_items
  SET 
    stock_quantity = COALESCE(new_stock, stock_quantity),
    is_available = true,
    updated_at = now()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;