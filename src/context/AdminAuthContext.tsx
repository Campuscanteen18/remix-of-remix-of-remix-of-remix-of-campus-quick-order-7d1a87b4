import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface AdminAuthContextType {
  isAdmin: boolean;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  hasPin: boolean;
  storedAdminEmail: string | null;
  authenticate: (pin: string) => boolean;
  createPin: (pin: string) => boolean;
  changePin: (oldPin: string, newPin: string) => boolean;
  resetPin: () => void;
  logout: () => void;
  lastActivity: Date | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'canteen_admin_session';
const ADMIN_PINS_KEY = 'canteen_admin_pins';
const ADMIN_EMAIL_KEY = 'canteen_admin_email';

// Simple hash function for PIN (in production, use proper hashing on server)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // Now using isAdmin from AuthContext (database-driven)
  const { user, isAdmin } = useAuth();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  // Get stored admin email for PIN-only access
  const getStoredAdminEmail = (): string | null => {
    try {
      return localStorage.getItem(ADMIN_EMAIL_KEY);
    } catch {
      return null;
    }
  };

  const storedAdminEmail = getStoredAdminEmail();

  // Check if admin has set up a PIN
  const getStoredPins = (): Record<string, string> => {
    try {
      const stored = localStorage.getItem(ADMIN_PINS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Check if there's a PIN for the current user or stored admin email
  const adminEmail = user?.email?.toLowerCase() || storedAdminEmail;
  const hasPin = adminEmail ? !!getStoredPins()[adminEmail] : false;

  // Check existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const emailToCheck = user?.email?.toLowerCase() || storedAdminEmail;
        
        // isAdmin now comes from database via AuthContext
        if (!emailToCheck || !isAdmin) {
          setIsAdminAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const session = localStorage.getItem(STORAGE_KEY);
        if (session) {
          const { timestamp, email } = JSON.parse(session);
          const elapsed = Date.now() - timestamp;
          
          if (email === emailToCheck && elapsed < SESSION_TIMEOUT) {
            setIsAdminAuthenticated(true);
            setLastActivity(new Date(timestamp));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setIsLoading(false);
    };

    checkSession();
  }, [user, isAdmin, storedAdminEmail]);

  // Update activity timestamp periodically
  useEffect(() => {
    const emailToUse = user?.email?.toLowerCase() || storedAdminEmail;
    if (!isAdminAuthenticated || !emailToUse) return;

    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        timestamp: now, 
        email: emailToUse 
      }));
      setLastActivity(new Date(now));
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    const interval = setInterval(() => {
      const session = localStorage.getItem(STORAGE_KEY);
      if (session) {
        const { timestamp } = JSON.parse(session);
        if (Date.now() - timestamp > SESSION_TIMEOUT) {
          setIsAdminAuthenticated(false);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }, 60000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [isAdminAuthenticated, user, storedAdminEmail]);

  const authenticate = useCallback((pin: string): boolean => {
    const emailToUse = user?.email?.toLowerCase() || storedAdminEmail;
    if (!emailToUse || !isAdmin) return false;

    const pins = getStoredPins();
    const storedHash = pins[emailToUse];
    
    if (!storedHash) return false;
    
    if (hashPin(pin) === storedHash) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        timestamp: now, 
        email: emailToUse 
      }));
      setIsAdminAuthenticated(true);
      setLastActivity(new Date(now));
      return true;
    }
    return false;
  }, [user, isAdmin, storedAdminEmail]);

  const createPin = useCallback((pin: string): boolean => {
    if (!user || !isAdmin || pin.length < 4) return false;

    const adminEmail = user.email.toLowerCase();
    const pins = getStoredPins();
    pins[adminEmail] = hashPin(pin);
    localStorage.setItem(ADMIN_PINS_KEY, JSON.stringify(pins));
    
    // Store admin email for PIN-only access on future visits
    localStorage.setItem(ADMIN_EMAIL_KEY, adminEmail);
    
    // Auto-authenticate after creating PIN
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      timestamp: now, 
      email: adminEmail 
    }));
    setIsAdminAuthenticated(true);
    setLastActivity(new Date(now));
    
    return true;
  }, [user, isAdmin]);

  const changePin = useCallback((oldPin: string, newPin: string): boolean => {
    const emailToUse = user?.email?.toLowerCase() || storedAdminEmail;
    if (!emailToUse || !isAdmin) return false;

    const pins = getStoredPins();
    const storedHash = pins[emailToUse];
    
    if (storedHash && hashPin(oldPin) === storedHash && newPin.length >= 4) {
      pins[emailToUse] = hashPin(newPin);
      localStorage.setItem(ADMIN_PINS_KEY, JSON.stringify(pins));
      return true;
    }
    return false;
  }, [user, isAdmin, storedAdminEmail]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAdminAuthenticated(false);
    setLastActivity(null);
  }, []);

  const resetPin = useCallback(() => {
    const emailToUse = user?.email?.toLowerCase() || storedAdminEmail;
    if (!emailToUse) return;
    
    const pins = getStoredPins();
    delete pins[emailToUse];
    localStorage.setItem(ADMIN_PINS_KEY, JSON.stringify(pins));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    setIsAdminAuthenticated(false);
    setLastActivity(null);
  }, [user, storedAdminEmail]);

  return (
    <AdminAuthContext.Provider value={{
      isAdmin,
      isAdminAuthenticated,
      isLoading,
      hasPin,
      storedAdminEmail,
      authenticate,
      createPin,
      changePin,
      resetPin,
      logout,
      lastActivity,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
