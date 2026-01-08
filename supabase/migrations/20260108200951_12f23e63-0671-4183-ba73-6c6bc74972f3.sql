-- =====================================================
-- MULTI-TENANT CANTEEN DATABASE SCHEMA
-- Version: 2.0 with Dynamic Settings
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('student', 'admin', 'kiosk', 'super_admin');

-- Order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'collected', 'cancelled');

-- Time period enum
CREATE TYPE public.time_period AS ENUM ('breakfast', 'lunch', 'snacks', 'dinner');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Campuses table (The Tenant Master Table)
CREATE TABLE public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{
        "payment": {
            "provider": "upi",
            "upi_id": null,
            "razorpay_key": null,
            "razorpay_secret": null
        },
        "printer": {
            "paper_width": "58mm",
            "bluetooth_name_prefix": "MTP",
            "print_logo": true,
            "footer_text": "Thank you for your order!"
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
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (Linked to campuses)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE RESTRICT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (Separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE RESTRICT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, campus_id, role)
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campus_id, name)
);

-- Menu items table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT true,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    available_time_periods public.time_period[] DEFAULT ARRAY['breakfast', 'lunch', 'snacks', 'dinner']::public.time_period[],
    stock_quantity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE RESTRICT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    status public.order_status NOT NULL DEFAULT 'pending',
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    qr_code TEXT,
    is_used BOOLEAN NOT NULL DEFAULT false,
    customer_name TEXT,
    customer_email TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campus_id, order_number)
);

-- Order items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Favorites table
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, menu_item_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_campus ON public.profiles(campus_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_campus ON public.user_roles(campus_id);
CREATE INDEX idx_categories_campus ON public.categories(campus_id);
CREATE INDEX idx_menu_items_campus ON public.menu_items(campus_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX idx_orders_campus ON public.orders(campus_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_campus ON public.favorites(campus_id);
CREATE INDEX idx_campuses_code ON public.campuses(code);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (Prevent RLS Recursion)
-- =====================================================

-- Get user's campus ID
CREATE OR REPLACE FUNCTION public.get_user_campus_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT campus_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Check if user has role at specific campus
CREATE OR REPLACE FUNCTION public.has_role_at_campus(_user_id UUID, _role public.app_role, _campus_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role AND campus_id = _campus_id
    )
$$;

-- Check if user is admin at their campus
CREATE OR REPLACE FUNCTION public.is_campus_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'admin'
    )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'super_admin'
    )
$$;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Generate order number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    campus_code TEXT;
    today_date TEXT;
    daily_count INTEGER;
BEGIN
    SELECT code INTO campus_code FROM public.campuses WHERE id = NEW.campus_id;
    today_date := to_char(now(), 'YYMMDD');
    
    SELECT COUNT(*) + 1 INTO daily_count
    FROM public.orders
    WHERE campus_id = NEW.campus_id
    AND DATE(created_at) = CURRENT_DATE;
    
    NEW.order_number := campus_code || '-' || today_date || '-' || LPAD(daily_count::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _campus_id UUID;
BEGIN
    _campus_id := (NEW.raw_user_meta_data->>'campus_id')::UUID;
    
    IF _campus_id IS NULL THEN
        RAISE EXCEPTION 'campus_id is required for registration';
    END IF;
    
    INSERT INTO public.profiles (user_id, campus_id, full_name, email)
    VALUES (
        NEW.id,
        _campus_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    
    INSERT INTO public.user_roles (user_id, campus_id, role)
    VALUES (NEW.id, _campus_id, 'student');
    
    RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_campuses_updated_at
    BEFORE UPDATE ON public.campuses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Campuses policies (Public read for active campuses - needed for campus selector)
CREATE POLICY "Anyone can view active campuses"
    ON public.campuses FOR SELECT
    USING (is_active = true);

CREATE POLICY "Super admins can manage all campuses"
    ON public.campuses FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Campus admins can view campus profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        campus_id = public.get_user_campus_id(auth.uid())
        AND public.is_campus_admin(auth.uid())
    );

-- User roles policies
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Campus admins can manage campus roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        campus_id = public.get_user_campus_id(auth.uid())
        AND public.is_campus_admin(auth.uid())
    );

-- Categories policies
CREATE POLICY "Anyone can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Campus admins can manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (
        campus_id = public.get_user_campus_id(auth.uid())
        AND public.is_campus_admin(auth.uid())
    );

-- Menu items policies
CREATE POLICY "Anyone can view available menu items"
    ON public.menu_items FOR SELECT
    USING (is_available = true);

CREATE POLICY "Campus admins can manage menu items"
    ON public.menu_items FOR ALL
    TO authenticated
    USING (
        campus_id = public.get_user_campus_id(auth.uid())
        AND public.is_campus_admin(auth.uid())
    );

-- Orders policies
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create orders at their campus"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (
        campus_id = public.get_user_campus_id(auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Campus admins can view all campus orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (
        campus_id = public.get_user_campus_id(auth.uid())
        AND (public.is_campus_admin(auth.uid()) OR public.has_role(auth.uid(), 'kiosk'))
    );

CREATE POLICY "Campus admins can update campus orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (
        campus_id = public.get_user_campus_id(auth.uid())
        AND (public.is_campus_admin(auth.uid()) OR public.has_role(auth.uid(), 'kiosk'))
    );

-- Order items policies
CREATE POLICY "Users can view own order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert order items for own orders"
    ON public.order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Campus admins can view campus order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.campus_id = public.get_user_campus_id(auth.uid())
            AND (public.is_campus_admin(auth.uid()) OR public.has_role(auth.uid(), 'kiosk'))
        )
    );

-- Favorites policies
CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own favorites"
    ON public.favorites FOR ALL
    TO authenticated
    USING (user_id = auth.uid());