import { useCallback } from 'react';
import { CartItem } from '@/types/canteen';
import { useMenu } from '@/context/MenuContext';

interface StockCheckResult {
  success: boolean;
  unavailableItems: CartItem[];
}

/**
 * Hook for checking stock availability before payment
 * Uses global MenuContext for real-time availability
 */
export function useStockCheck() {
  const { menuItems } = useMenu();

  const checkStock = useCallback(async (cartItems: CartItem[]): Promise<StockCheckResult> => {
    // Simulate network delay for stock check
    await new Promise(resolve => setTimeout(resolve, 300));

    const unavailableItems: CartItem[] = [];

    for (const cartItem of cartItems) {
      const menuItem = menuItems.find(m => m.id === cartItem.id);
      
      // Item doesn't exist or is unavailable
      if (!menuItem || !menuItem.isAvailable) {
        unavailableItems.push(cartItem);
      }
      
      // SIMULATION: If item name contains "SoldOut", treat as unavailable (for testing)
      if (cartItem.name.toLowerCase().includes('soldout')) {
        unavailableItems.push(cartItem);
      }
    }

    return {
      success: unavailableItems.length === 0,
      unavailableItems,
    };
  }, [menuItems]);

  return { checkStock };
}
