import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MenuItem } from '@/types/canteen';
import { menuItems as initialMenuItems } from '@/data/menuData';

interface MenuContextType {
  menuItems: MenuItem[];
  updateItemAvailability: (itemId: string, isAvailable: boolean) => void;
  getMenuItem: (itemId: string) => MenuItem | undefined;
  refreshMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

const STORAGE_KEY = 'canteen_menu_items';

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Load menu items from localStorage on mount
  useEffect(() => {
    const loadMenuItems = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Merge with initial items (in case new items were added)
          const merged = initialMenuItems.map(item => {
            const storedItem = parsed.find((s: MenuItem) => s.id === item.id);
            return storedItem ? { ...item, isAvailable: storedItem.isAvailable } : item;
          });
          setMenuItems(merged);
        } catch {
          setMenuItems(initialMenuItems);
        }
      } else {
        setMenuItems(initialMenuItems);
      }
    };

    loadMenuItems();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadMenuItems();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save to localStorage whenever menuItems change
  useEffect(() => {
    if (menuItems.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(menuItems));
    }
  }, [menuItems]);

  const updateItemAvailability = useCallback((itemId: string, isAvailable: boolean) => {
    setMenuItems(prev => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, isAvailable } : item
      );
      // Immediately persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getMenuItem = useCallback((itemId: string) => {
    return menuItems.find(item => item.id === itemId);
  }, [menuItems]);

  const refreshMenu = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const merged = initialMenuItems.map(item => {
          const storedItem = parsed.find((s: MenuItem) => s.id === item.id);
          return storedItem ? { ...item, isAvailable: storedItem.isAvailable } : item;
        });
        setMenuItems(merged);
      } catch {
        setMenuItems(initialMenuItems);
      }
    }
  }, []);

  return (
    <MenuContext.Provider value={{
      menuItems,
      updateItemAvailability,
      getMenuItem,
      refreshMenu,
    }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
