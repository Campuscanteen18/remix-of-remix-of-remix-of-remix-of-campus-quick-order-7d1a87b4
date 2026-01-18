-- ================================================
-- SUPER ADMIN DASHBOARD DATABASE SCHEMA
-- ================================================

-- 1. Create canteens table (linked to campuses)
CREATE TABLE public.canteens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    upi_id TEXT,
    commission_rate NUMERIC DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create platform_settings table (singleton for global config)
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_verification_enabled BOOLEAN DEFAULT true,
    global_commission_rate NUMERIC DEFAULT 10,
    settlement_period TEXT DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.platform_settings (manual_verification_enabled, global_commission_rate)
VALUES (true, 10);

-- 3. Create settlements table (for tracking vendor payouts)
CREATE TABLE public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_sales NUMERIC DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    commission_amount NUMERIC DEFAULT 0,
    net_payable NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'disputed')),
    paid_at TIMESTAMPTZ,
    payment_reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add canteen_id and UTR tracking to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS canteen_id UUID REFERENCES public.canteens(id),
ADD COLUMN IF NOT EXISTS utr_number TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

-- 5. Enable RLS on new tables
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for canteens
CREATE POLICY "Super admins can manage all canteens"
ON public.canteens FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Campus admins can view their canteens"
ON public.canteens FOR SELECT
USING (campus_id = get_user_campus_id(auth.uid()) AND is_campus_admin(auth.uid()));

CREATE POLICY "Public can view active canteens"
ON public.canteens FOR SELECT
USING (is_active = true);

-- 7. RLS Policies for platform_settings
CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

-- 8. RLS Policies for settlements
CREATE POLICY "Super admins can manage all settlements"
ON public.settlements FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Campus admins can view their settlements"
ON public.settlements FOR SELECT
USING (campus_id = get_user_campus_id(auth.uid()) AND is_campus_admin(auth.uid()));

-- 9. Create function to get pending verification count
CREATE OR REPLACE FUNCTION public.get_pending_verification_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.orders
    WHERE verification_status = 'pending'
    AND payment_status = 'pending';
$$;

-- 10. Create function to get dashboard stats for super admin
CREATE OR REPLACE FUNCTION public.get_super_admin_stats(
    p_campus_id UUID DEFAULT NULL,
    p_canteen_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_gmv', COALESCE(SUM(CASE WHEN payment_status = 'success' THEN total ELSE 0 END), 0),
        'net_revenue', COALESCE(SUM(CASE WHEN payment_status = 'success' THEN commission_amount ELSE 0 END), 0),
        'pending_payouts', COALESCE(
            (SELECT SUM(net_payable) FROM settlements WHERE status = 'pending'),
            0
        ),
        'active_orders', COUNT(CASE WHEN status IN ('confirmed', 'preparing') THEN 1 END),
        'pending_verification', COUNT(CASE WHEN verification_status = 'pending' AND payment_status = 'pending' THEN 1 END),
        'total_orders_today', COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)
    ) INTO result
    FROM orders
    WHERE (p_campus_id IS NULL OR campus_id = p_campus_id)
    AND (p_canteen_id IS NULL OR canteen_id = p_canteen_id);
    
    RETURN result;
END;
$$;

-- 11. Create trigger to update timestamps
CREATE TRIGGER update_canteens_updated_at
BEFORE UPDATE ON public.canteens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settlements_updated_at
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Add indexes for performance
CREATE INDEX idx_canteens_campus_id ON public.canteens(campus_id);
CREATE INDEX idx_settlements_canteen_id ON public.settlements(canteen_id);
CREATE INDEX idx_settlements_status ON public.settlements(status);
CREATE INDEX idx_orders_verification_status ON public.orders(verification_status);
CREATE INDEX idx_orders_canteen_id ON public.orders(canteen_id);