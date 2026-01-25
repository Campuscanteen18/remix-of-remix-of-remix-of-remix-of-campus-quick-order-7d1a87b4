-- =====================================================
-- 1. SUPPORT TICKETS TABLE
-- =====================================================
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('payment', 'order', 'account', 'general')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence for ticket numbers
CREATE SEQUENCE public.ticket_number_seq START 1;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_ticket_number_trigger
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number();

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (is_super_admin(auth.uid()));

-- =====================================================
-- 2. TICKET MESSAGES TABLE (for replies)
-- =====================================================
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view messages on own tickets"
ON public.ticket_messages FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Users can add messages to own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_messages.ticket_id AND user_id = auth.uid()
) AND sender_type = 'user');

CREATE POLICY "Super admins can manage all messages"
ON public.ticket_messages FOR ALL
USING (is_super_admin(auth.uid()));

-- =====================================================
-- 3. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Only super admins can view
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. FUNCTION TO GET TICKET STATS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_ticket_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_open_count INTEGER;
    v_in_progress_count INTEGER;
    v_resolved_count INTEGER;
    v_today_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_open_count FROM support_tickets WHERE status = 'open';
    SELECT COUNT(*) INTO v_in_progress_count FROM support_tickets WHERE status = 'in_progress';
    SELECT COUNT(*) INTO v_resolved_count FROM support_tickets WHERE status = 'resolved';
    SELECT COUNT(*) INTO v_today_count FROM support_tickets WHERE DATE(created_at) = CURRENT_DATE;
    
    RETURN json_build_object(
        'open_tickets', v_open_count,
        'in_progress_tickets', v_in_progress_count,
        'resolved_tickets', v_resolved_count,
        'today_tickets', v_today_count
    );
END;
$$;

-- =====================================================
-- 5. FUNCTION TO GET USER STATS BY CAMPUS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_campus_user_stats(p_campus_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_users INTEGER;
    v_admins INTEGER;
    v_students INTEGER;
    v_kiosk_users INTEGER;
BEGIN
    SELECT COUNT(DISTINCT p.user_id) INTO v_total_users
    FROM profiles p
    WHERE (p_campus_id IS NULL OR p.campus_id = p_campus_id);
    
    SELECT COUNT(*) INTO v_admins
    FROM user_roles ur
    WHERE ur.role = 'admin' AND (p_campus_id IS NULL OR ur.campus_id = p_campus_id);
    
    SELECT COUNT(*) INTO v_students
    FROM user_roles ur
    WHERE ur.role = 'student' AND (p_campus_id IS NULL OR ur.campus_id = p_campus_id);
    
    SELECT COUNT(*) INTO v_kiosk_users
    FROM user_roles ur
    WHERE ur.role = 'kiosk' AND (p_campus_id IS NULL OR ur.campus_id = p_campus_id);
    
    RETURN json_build_object(
        'total_users', v_total_users,
        'admins', v_admins,
        'students', v_students,
        'kiosk_users', v_kiosk_users
    );
END;
$$;