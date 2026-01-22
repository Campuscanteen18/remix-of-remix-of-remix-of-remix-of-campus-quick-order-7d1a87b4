import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, CartItem } from '@/types/canteen';
import { supabase } from '@/integrations/supabase/client';

interface OrdersContextType {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  markOrderCollected: (orderId: string) => void;
  getOrderByQR: (qrCode: string) => Order | undefined;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

const STORAGE_KEY = 'canteen_orders';

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  // Load orders from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const ordersWithDates = parsed.map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt),
        }));
        setOrders(ordersWithDates);
      } catch {
        setOrders([]);
      }
    }
  }, []);

  // Save to localStorage whenever orders change
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  const addOrder = useCallback((order: Order) => {
    setOrders(prev => {
      const updated = [order, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    setOrders(prev => {
      const updated = prev.map(order =>
        order.id === orderId ? { ...order, status } : order
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markOrderCollected = useCallback(async (orderId: string) => {
    // Update local state immediately
    setOrders(prev => {
      const updated = prev.map(order =>
        order.id === orderId ? { ...order, status: 'collected' as const, isUsed: true } : order
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Also update the database to mark is_used = true
    try {
      await supabase
        .from('orders')
        .update({ is_used: true, status: 'collected' as const })
        .eq('id', orderId);
    } catch (error) {
      console.error('Failed to update order in database:', error);
    }
  }, []);

  const getOrderByQR = useCallback((qrCode: string) => {
    return orders.find(order => order.qrCode === qrCode || order.id === qrCode);
  }, [orders]);

  const getOrderById = useCallback((orderId: string) => {
    return orders.find(order => order.id === orderId);
  }, [orders]);

  return (
    <OrdersContext.Provider value={{
      orders,
      addOrder,
      updateOrderStatus,
      markOrderCollected,
      getOrderByQR,
      getOrderById,
    }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrdersContext() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrdersContext must be used within an OrdersProvider');
  }
  return context;
}
