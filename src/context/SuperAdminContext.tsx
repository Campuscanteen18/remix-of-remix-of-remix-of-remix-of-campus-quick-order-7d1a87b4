import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalFilters, PlatformSettings, DashboardStats, Canteen } from '@/types/superAdmin';

interface Campus {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface SuperAdminContextType {
  // Global filters
  filters: GlobalFilters;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>;
  
  // Data
  campuses: Campus[];
  canteens: Canteen[];
  platformSettings: PlatformSettings | null;
  dashboardStats: DashboardStats | null;
  pendingCount: number;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  updatePlatformSettings: (settings: Partial<PlatformSettings>) => Promise<boolean>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>({
    campusId: null,
    canteenId: null,
  });
  
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('campuses')
      .select('id, name, code, is_active')
      .order('name');
    
    if (!error && data) {
      setCampuses(data);
    }
  }, []);

  const fetchCanteens = useCallback(async () => {
    let query = supabase
      .from('canteens')
      .select('*, campus:campuses(name, code)')
      .order('name');
    
    if (filters.campusId) {
      query = query.eq('campus_id', filters.campusId);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      setCanteens(data as Canteen[]);
    }
  }, [filters.campusId]);

  const fetchPlatformSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single();
    
    if (!error && data) {
      setPlatformSettings(data as PlatformSettings);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_super_admin_stats', {
      p_campus_id: filters.campusId,
      p_canteen_id: filters.canteenId,
    });
    
    if (!error && data) {
      setDashboardStats(data as unknown as DashboardStats);
    }
  }, [filters.campusId, filters.canteenId]);

  const fetchPendingCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_pending_verification_count');
    
    if (!error && data !== null) {
      setPendingCount(data);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchCampuses(),
      fetchCanteens(),
      fetchPlatformSettings(),
      fetchDashboardStats(),
      fetchPendingCount(),
    ]);
    setIsLoading(false);
  }, [fetchCampuses, fetchCanteens, fetchPlatformSettings, fetchDashboardStats, fetchPendingCount]);

  const updatePlatformSettings = useCallback(async (settings: Partial<PlatformSettings>): Promise<boolean> => {
    if (!platformSettings) return false;
    
    const { error } = await supabase
      .from('platform_settings')
      .update(settings)
      .eq('id', platformSettings.id);
    
    if (!error) {
      setPlatformSettings(prev => prev ? { ...prev, ...settings } : null);
      return true;
    }
    return false;
  }, [platformSettings]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh when filters change
  useEffect(() => {
    fetchCanteens();
    fetchDashboardStats();
  }, [filters.campusId, filters.canteenId, fetchCanteens, fetchDashboardStats]);

  // Real-time subscription for pending orders
  useEffect(() => {
    const channel = supabase
      .channel('pending-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'verification_status=eq.pending',
        },
        () => {
          fetchPendingCount();
          fetchDashboardStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingCount, fetchDashboardStats]);

  return (
    <SuperAdminContext.Provider
      value={{
        filters,
        setFilters,
        campuses,
        canteens,
        platformSettings,
        dashboardStats,
        pendingCount,
        isLoading,
        refreshData,
        updatePlatformSettings,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
}
