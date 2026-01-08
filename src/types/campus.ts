// Campus types for multi-tenant architecture

export interface PaymentSettings {
  provider: 'upi' | 'razorpay';
  upi_id?: string;
  razorpay_key?: string;
  razorpay_secret?: string;
}

export interface PrinterSettings {
  paper_width: '58mm' | '80mm';
  bluetooth_name_prefix: string;
  print_logo: boolean;
  footer_text: string;
}

export interface BrandingSettings {
  primary_color: string;
  secondary_color: string;
}

export interface OperationalSettings {
  currency: string;
  tax_rate: number;
  service_charge: number;
}

export interface CampusSettings {
  payment: PaymentSettings;
  printer: PrinterSettings;
  branding: BrandingSettings;
  operational: OperationalSettings;
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  address: string | null;
  is_active: boolean;
  settings: CampusSettings;
  created_at: string;
  updated_at: string;
}
