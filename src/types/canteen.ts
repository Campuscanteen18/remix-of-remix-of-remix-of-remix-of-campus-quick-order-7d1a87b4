export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  isPopular?: boolean;
  isAvailable: boolean;
  availableTimePeriods: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'collected';
  qrCode: string;
  createdAt: Date;
  isUsed: boolean;
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: string;
}

export interface TimePeriod {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
}

// Updated role types
export type UserRole = 'student' | 'admin' | 'kiosk';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  collegeId?: string;
  role: UserRole;
  adminPin?: string; // Hashed PIN for admin access
}
