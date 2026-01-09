import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Campus, CampusSettings } from '@/types/campus';

interface CampusContextType {
  campus: Campus | null;
  isLoading: boolean;
  error: string | null;
  settings: CampusSettings | null;
  setCampusByCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  clearCampus: () => void;
  hasCampus: boolean;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

const CAMPUS_CODE_KEY = 'campus_code';

// Default settings fallback
const defaultSettings: CampusSettings = {
  payment: {
    provider: 'upi',
    upi_id: null,
    razorpay_key: null,
    razorpay_secret: null,
  },
  printer: {
    paper_width: '58mm',
    bluetooth_name_prefix: 'MTP',
    print_logo: true,
    footer_text: 'Thank you for your order!',
  },
  branding: {
    primary_color: '#10b981',
    secondary_color: '#f59e0b',
  },
  operational: {
    currency: 'INR',
    tax_rate: 0,
    service_charge: 0,
  },
};

export function CampusProvider({ children }: { children: ReactNode }) {
  const [campus, setCampus] = useState<Campus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campus by code
  const fetchCampusByCode = useCallback(async (code: string): Promise<Campus | null> => {
    const { data, error: fetchError } = await supabase
      .from('campuses')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (fetchError || !data) {
      return null;
    }

    // Parse settings with fallback
    const settings = {
      ...defaultSettings,
      ...(data.settings as unknown as Partial<CampusSettings>),
    };

    return {
      ...data,
      settings,
    } as Campus;
  }, []);

  const fetchCampusById = useCallback(async (id: string): Promise<Campus | null> => {
    const { data, error: fetchError } = await supabase
      .from('campuses')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (fetchError || !data) return null;

    const settings = {
      ...defaultSettings,
      ...(data.settings as unknown as Partial<CampusSettings>),
    };

    return {
      ...data,
      settings,
    } as Campus;
  }, []);

  // Initialize campus from localStorage on mount
  useEffect(() => {
    const initCampus = async () => {
      const savedCode = localStorage.getItem(CAMPUS_CODE_KEY);

      // 1) Preferred: restore campus by saved code
      if (savedCode) {
        const campusData = await fetchCampusByCode(savedCode);
        if (campusData) {
          setCampus(campusData);
          setIsLoading(false);
          return;
        }
        // Invalid saved code, clear it
        localStorage.removeItem(CAMPUS_CODE_KEY);
      }

      // 2) Fallback: if user is already logged in, infer campus from user metadata
      const { data: { session } } = await supabase.auth.getSession();
      const campusId = session?.user?.user_metadata?.campus_id;
      if (typeof campusId === 'string' && campusId) {
        const campusData = await fetchCampusById(campusId);
        if (campusData) {
          setCampus(campusData);
          localStorage.setItem(CAMPUS_CODE_KEY, campusData.code);
        }
      }

      setIsLoading(false);
    };

    initCampus();
  }, [fetchCampusByCode, fetchCampusById]);

  // Set campus by code (used by campus selector)
  const setCampusByCode = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const campusData = await fetchCampusByCode(code);
      
      if (!campusData) {
        setError('Campus not found. Please check the code and try again.');
        return { success: false, error: 'Campus not found' };
      }

      setCampus(campusData);
      localStorage.setItem(CAMPUS_CODE_KEY, code.toUpperCase());
      
      return { success: true };
    } catch (err) {
      const message = 'Failed to fetch campus details';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchCampusByCode]);

  // Clear campus (logout or switch)
  const clearCampus = useCallback(() => {
    setCampus(null);
    localStorage.removeItem(CAMPUS_CODE_KEY);
  }, []);

  return (
    <CampusContext.Provider
      value={{
        campus,
        isLoading,
        error,
        settings: campus?.settings || null,
        setCampusByCode,
        clearCampus,
        hasCampus: !!campus,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
}
