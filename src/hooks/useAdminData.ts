import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface MenuItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image?: string;
  is_veg: boolean;
  is_popular: boolean;
  is_available: boolean;
  available_time_periods: string[];
}

interface Order {
  id: string;
  user_id: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  user_name?: string;
}

interface OrderStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  todayOrders: number;
  chartData: { day: string; revenue: number; orders: number }[];
}

// Storage keys
const MENU_ITEMS_KEY = 'canteen_admin_menu_items';
const ORDERS_KEY = 'canteen_admin_orders';
const STATS_KEY = 'canteen_admin_stats';

// Default data generators
const generateDefaultMenuItems = (): MenuItem[] => [
  { id: '1', name: 'Masala Dosa', price: 60, quantity: 50, category: 'breakfast', is_veg: true, is_popular: true, is_available: true, available_time_periods: ['breakfast', 'lunch'] },
  { id: '2', name: 'Idli Sambar', price: 40, quantity: 100, category: 'breakfast', is_veg: true, is_popular: true, is_available: true, available_time_periods: ['breakfast'] },
  { id: '3', name: 'Veg Biryani', price: 120, quantity: 30, category: 'lunch', is_veg: true, is_popular: true, is_available: true, available_time_periods: ['lunch', 'dinner'] },
  { id: '4', name: 'Chicken Biryani', price: 150, quantity: 25, category: 'lunch', is_veg: false, is_popular: true, is_available: true, available_time_periods: ['lunch', 'dinner'] },
  { id: '5', name: 'Samosa', price: 20, quantity: 200, category: 'snacks', is_veg: true, is_popular: true, is_available: true, available_time_periods: ['snacks'] },
  { id: '6', name: 'Tea', price: 15, quantity: 500, category: 'beverages', is_veg: true, is_popular: false, is_available: true, available_time_periods: ['breakfast', 'snacks'] },
  { id: '7', name: 'Coffee', price: 25, quantity: 300, category: 'beverages', is_veg: true, is_popular: true, is_available: true, available_time_periods: ['breakfast', 'snacks'] },
  { id: '8', name: 'Paneer Butter Masala', price: 140, quantity: 20, category: 'main-course', is_veg: true, is_popular: false, is_available: true, available_time_periods: ['lunch', 'dinner'] },
];

const generateDefaultOrders = (): Order[] => [
  { id: 'ORD-001', user_id: 'user_1', items: [{ name: 'Masala Dosa', quantity: 2, price: 60 }], total: 120, status: 'pending', created_at: new Date().toISOString(), user_name: 'John Doe' },
  { id: 'ORD-002', user_id: 'user_2', items: [{ name: 'Coffee', quantity: 3, price: 25 }], total: 75, status: 'preparing', created_at: new Date(Date.now() - 3600000).toISOString(), user_name: 'Jane Smith' },
  { id: 'ORD-003', user_id: 'user_3', items: [{ name: 'Veg Biryani', quantity: 1, price: 120 }, { name: 'Tea', quantity: 1, price: 15 }], total: 135, status: 'ready', created_at: new Date(Date.now() - 7200000).toISOString(), user_name: 'Bob Wilson' },
  { id: 'ORD-004', user_id: 'user_1', items: [{ name: 'Samosa', quantity: 5, price: 20 }], total: 100, status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), user_name: 'John Doe' },
];

const generateDefaultStats = (): OrderStats => ({
  totalRevenue: 24580,
  totalOrders: 156,
  avgOrderValue: 158,
  todayOrders: 23,
  chartData: [
    { day: 'Mon', revenue: 3200, orders: 18 },
    { day: 'Tue', revenue: 2800, orders: 15 },
    { day: 'Wed', revenue: 4100, orders: 24 },
    { day: 'Thu', revenue: 3600, orders: 21 },
    { day: 'Fri', revenue: 4500, orders: 28 },
    { day: 'Sat', revenue: 3200, orders: 25 },
    { day: 'Sun', revenue: 3180, orders: 25 },
  ],
});

// LocalStorage helpers
const getStoredData = <T>(key: string, defaultFn: () => T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
  }
  const defaultData = defaultFn();
  localStorage.setItem(key, JSON.stringify(defaultData));
  return defaultData;
};

const setStoredData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

// Simulate API delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Hooks
export function useAdminMenuItems() {
  return useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: async () => {
      await delay();
      return getStoredData(MENU_ITEMS_KEY, generateDefaultMenuItems);
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<MenuItem, 'id'>) => {
      await delay();
      const items = getStoredData(MENU_ITEMS_KEY, generateDefaultMenuItems);
      const newItem: MenuItem = { ...item, id: `item_${Date.now()}` };
      const updatedItems = [...items, newItem];
      setStoredData(MENU_ITEMS_KEY, updatedItems);
      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: Partial<MenuItem> & { id: string }) => {
      await delay();
      const items = getStoredData(MENU_ITEMS_KEY, generateDefaultMenuItems);
      const updatedItems = items.map(item => 
        item.id === update.id ? { ...item, ...update } : item
      );
      setStoredData(MENU_ITEMS_KEY, updatedItems);
      return updatedItems.find(item => item.id === update.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await delay();
      const items = getStoredData(MENU_ITEMS_KEY, generateDefaultMenuItems);
      const updatedItems = items.filter(item => item.id !== id);
      setStoredData(MENU_ITEMS_KEY, updatedItems);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      await delay();
      return getStoredData(ORDERS_KEY, generateDefaultOrders);
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await delay();
      const orders = getStoredData(ORDERS_KEY, generateDefaultOrders);
      const updatedOrders = orders.map(order => 
        order.id === id ? { ...order, status: status as Order['status'] } : order
      );
      setStoredData(ORDERS_KEY, updatedOrders);
      return updatedOrders.find(order => order.id === id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      await delay();
      // Calculate stats from stored orders
      const orders = getStoredData(ORDERS_KEY, generateDefaultOrders);
      const stored = getStoredData(STATS_KEY, generateDefaultStats);
      
      // Update with real order count
      return {
        ...stored,
        totalOrders: orders.length + stored.totalOrders,
      };
    },
  });
}

// Utility to reset all admin data
export function useResetAdminData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await delay();
      localStorage.removeItem(MENU_ITEMS_KEY);
      localStorage.removeItem(ORDERS_KEY);
      localStorage.removeItem(STATS_KEY);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
  });
}
