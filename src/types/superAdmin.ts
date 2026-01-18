// Super Admin Dashboard Types

export interface Canteen {
  id: string;
  campus_id: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  campus?: {
    name: string;
    code: string;
  };
}

export interface Settlement {
  id: string;
  canteen_id: string;
  campus_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_orders: number;
  commission_amount: number;
  net_payable: number;
  status: 'pending' | 'processing' | 'paid' | 'disputed';
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  canteen?: Canteen;
  campus?: {
    name: string;
    code: string;
  };
}

export interface PlatformSettings {
  id: string;
  manual_verification_enabled: boolean;
  global_commission_rate: number;
  settlement_period: string;
  created_at: string;
  updated_at: string;
}

export interface PendingOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  campus_id: string;
  canteen_id: string | null;
  total: number;
  utr_number: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  payment_status: string;
  created_at: string;
  campus?: {
    name: string;
    code: string;
  };
  canteen?: {
    name: string;
  };
}

export interface DashboardStats {
  total_gmv: number;
  net_revenue: number;
  pending_payouts: number;
  active_orders: number;
  pending_verification: number;
  total_orders_today: number;
}

export interface GlobalFilters {
  campusId: string | null;
  canteenId: string | null;
}
