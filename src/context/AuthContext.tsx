import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '@/types/canteen';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isKiosk: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simulated delay to mimic real API calls
const simulateApiDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

// Determine role from email
const getRoleFromEmail = (email: string): UserRole => {
  const lowerEmail = email.toLowerCase();
  
  if (lowerEmail.includes('admin') || lowerEmail.includes('owner')) {
    return 'admin';
  }
  
  if (lowerEmail.includes('kiosk') || lowerEmail.includes('counter')) {
    return 'kiosk';
  }
  
  return 'student';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      await simulateApiDelay(500);
      
      const savedUser = localStorage.getItem('canteen_user');
      
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch {
          localStorage.removeItem('canteen_user');
        }
      }
      
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      await simulateApiDelay();
      
      // Simulate validation
      if (!email.includes('@')) {
        return { success: false, error: 'Invalid email format' };
      }
      
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      const role = getRoleFromEmail(email);

      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        fullName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        role,
      };

      setUser(mockUser);
      localStorage.setItem('canteen_user', JSON.stringify(mockUser));
      
      return { success: true, role };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    
    try {
      await simulateApiDelay();
      
      // Simulate validation
      if (!email.includes('@')) {
        return { success: false, error: 'Invalid email format' };
      }
      
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      if (fullName.length < 2) {
        return { success: false, error: 'Name must be at least 2 characters' };
      }

      // New signups are always students
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        fullName,
        role: 'student',
      };

      setUser(mockUser);
      localStorage.setItem('canteen_user', JSON.stringify(mockUser));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await simulateApiDelay(300);
      
      setUser(null);
      localStorage.removeItem('canteen_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('canteen_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await simulateApiDelay(500);
    
    // Mock validation
    if (currentPassword.length < 6) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }
    
    // Mock success
    return { success: true };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await simulateApiDelay(500);
    // Always return success (mock)
    return { success: true };
  }, []);

  const isAdmin = user?.role === 'admin';
  const isKiosk = user?.role === 'kiosk';

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin,
      isKiosk,
      login,
      signup,
      logout,
      updateUser,
      changePassword,
      requestPasswordReset,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
