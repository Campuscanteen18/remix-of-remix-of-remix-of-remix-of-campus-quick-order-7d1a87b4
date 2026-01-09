-- Insert new campus: CMR Institute of Engineering and Technology
INSERT INTO public.campuses (name, code, address, is_active, settings) 
VALUES (
  'CMR Institute of Engineering and Technology', 
  'CMRIT', 
  'Hyderabad, Telangana',
  true,
  '{"payment": {"upi_id": null, "provider": "upi", "razorpay_key": null, "razorpay_secret": null}, "printer": {"print_logo": true, "footer_text": "Thank you for your order!", "paper_width": "58mm", "bluetooth_name_prefix": "MTP"}, "branding": {"primary_color": "#10b981", "secondary_color": "#f59e0b"}, "operational": {"currency": "INR", "tax_rate": 0, "service_charge": 0}}'::jsonb
);