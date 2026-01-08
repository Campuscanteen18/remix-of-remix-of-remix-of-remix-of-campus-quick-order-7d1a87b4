import { useState, useEffect, useCallback } from 'react';
import { Order, CartItem } from '@/types/canteen';
import { useOrdersContext } from '@/context/OrdersContext';

interface CreateOrderParams {
  items: CartItem[];
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerEmail?: string;
}

interface UseOrdersReturn {
  orders: Order[];
  activeOrders: Order[];
  isLoading: boolean;
  error: string | null;
  createOrder: (params: CreateOrderParams) => Promise<Order | null>;
  isCreating: boolean;
  refetch: () => Promise<void>;
}

// Mock orders for demo
const generateMockOrders = (): Order[] => [
  {
    id: 'ord_abc123',
    items: [
      { id: '5', name: 'Masala Dosa', description: '', price: 60, image: '', category: 'breakfast', isVeg: true, isAvailable: true, availableTimePeriods: [], quantity: 1 },
      { id: '6', name: 'Filter Coffee', description: '', price: 25, image: '', category: 'beverages', isVeg: true, isAvailable: true, availableTimePeriods: [], quantity: 2 }
    ],
    total: 110,
    status: 'ready',
    qrCode: 'ORD-2024-045',
    createdAt: new Date(Date.now() - 30 * 60000),
    isUsed: false,
  },
  {
    id: 'ord_def456',
    items: [
      { id: '2', name: 'Veg Biryani', description: '', price: 120, image: '', category: 'main-course', isVeg: true, isAvailable: true, availableTimePeriods: [], quantity: 1 },
    ],
    total: 120,
    status: 'preparing',
    qrCode: 'ORD-2024-044',
    createdAt: new Date(Date.now() - 45 * 60000),
    isUsed: false,
  },
];

/**
 * Hook for managing orders
 * TODO: Replace with real Supabase queries when Cloud is enabled
 */
export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addOrder } = useOrdersContext();

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Replace with real Supabase query
      // const { data, error } = await supabase
      //   .from('orders')
      //   .select('*, order_items(*)')
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: false });
      
      setOrders(generateMockOrders());
    } catch (err) {
      setError('Failed to load orders. Please try again.');
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = useCallback(async (params: CreateOrderParams): Promise<Order | null> => {
    setIsCreating(true);
    setError(null);
    
    try {
      // Simulate API delay for payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Replace with real Supabase insert
      // const { data, error } = await supabase
      //   .from('orders')
      //   .insert({ user_id: userId, total: params.total, payment_method: params.paymentMethod })
      //   .select()
      //   .single();
      
      // Generate numeric order ID like ORDER6374
      const orderNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const orderId = `ORDER${orderNum}`;
      
      const newOrder: Order = {
        id: orderId,
        items: params.items,
        total: params.total,
        status: 'confirmed',
        qrCode: orderId, // QR contains just ORDER6374
        createdAt: new Date(),
        isUsed: false,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        paymentMethod: params.paymentMethod,
      };

      // Add to global context (persists to localStorage)
      addOrder(newOrder);
      
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      setError('Failed to create order. Please try again.');
      console.error('Error creating order:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Filter only active orders (paid and uncollected)
  const activeOrders = orders.filter(order => 
    order.status !== 'collected' && !order.isUsed
  );

  return {
    orders,
    activeOrders,
    isLoading,
    error,
    createOrder,
    isCreating,
    refetch: fetchOrders,
  };
}
