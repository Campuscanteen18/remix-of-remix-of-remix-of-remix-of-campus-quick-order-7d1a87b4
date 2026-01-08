-- Seed data: Create DEMO campus for testing
INSERT INTO public.campuses (
  name,
  code,
  address,
  is_active,
  settings
) VALUES (
  'Demo Engineering College',
  'DEMO',
  '123 Demo Street, Education City',
  true,
  '{
    "payment": {
      "provider": "upi",
      "upi_id": "demo@upi",
      "razorpay_key": null,
      "razorpay_secret": null
    },
    "printer": {
      "paper_width": "58mm",
      "bluetooth_name_prefix": "MTP",
      "print_logo": true,
      "footer_text": "Thank you for visiting Demo Canteen!"
    },
    "branding": {
      "primary_color": "#10b981",
      "secondary_color": "#f59e0b"
    },
    "operational": {
      "currency": "INR",
      "tax_rate": 0,
      "service_charge": 0
    }
  }'::jsonb
);

-- Get the campus ID for inserting menu items
DO $$
DECLARE
  demo_campus_id UUID;
BEGIN
  SELECT id INTO demo_campus_id FROM public.campuses WHERE code = 'DEMO' LIMIT 1;
  
  -- Insert sample menu items for DEMO campus
  INSERT INTO public.menu_items (campus_id, name, description, price, is_veg, is_popular, is_available, available_time_periods, stock_quantity) VALUES
    (demo_campus_id, 'Masala Dosa', 'Crispy South Indian crepe with spiced potato filling', 60, true, true, true, ARRAY['breakfast', 'lunch']::time_period[], 50),
    (demo_campus_id, 'Idli Sambar', 'Steamed rice cakes served with lentil soup', 40, true, true, true, ARRAY['breakfast']::time_period[], 100),
    (demo_campus_id, 'Veg Biryani', 'Fragrant basmati rice with mixed vegetables', 120, true, true, true, ARRAY['lunch', 'dinner']::time_period[], 30),
    (demo_campus_id, 'Chicken Biryani', 'Aromatic basmati rice with tender chicken pieces', 150, false, true, true, ARRAY['lunch', 'dinner']::time_period[], 25),
    (demo_campus_id, 'Samosa', 'Crispy fried pastry with spiced potato filling', 20, true, true, true, ARRAY['snacks']::time_period[], 200),
    (demo_campus_id, 'Tea', 'Hot Indian masala chai', 15, true, false, true, ARRAY['breakfast', 'snacks']::time_period[], 500),
    (demo_campus_id, 'Coffee', 'Fresh brewed filter coffee', 25, true, true, true, ARRAY['breakfast', 'snacks']::time_period[], 300),
    (demo_campus_id, 'Paneer Butter Masala', 'Cottage cheese in rich tomato gravy', 140, true, false, true, ARRAY['lunch', 'dinner']::time_period[], 20),
    (demo_campus_id, 'Vada Pav', 'Mumbai-style potato fritter in a bun', 25, true, true, true, ARRAY['breakfast', 'snacks']::time_period[], 100),
    (demo_campus_id, 'Cold Coffee', 'Refreshing iced coffee with cream', 50, true, false, true, ARRAY['lunch', 'snacks']::time_period[], 80);
END $$;