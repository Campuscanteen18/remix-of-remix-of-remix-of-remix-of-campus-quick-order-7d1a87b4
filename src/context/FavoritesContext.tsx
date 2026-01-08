import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FavoritesContextType {
  favorites: string[];
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
  toggleFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (itemId: string) => {
    setFavorites(prev => [...new Set([...prev, itemId])]);
  };

  const removeFavorite = (itemId: string) => {
    setFavorites(prev => prev.filter(id => id !== itemId));
  };

  const toggleFavorite = (itemId: string) => {
    if (favorites.includes(itemId)) {
      removeFavorite(itemId);
    } else {
      addFavorite(itemId);
    }
  };

  const isFavorite = (itemId: string) => favorites.includes(itemId);

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
