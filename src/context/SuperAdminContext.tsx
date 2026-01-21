import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalFilters, PlatformSettings, DashboardStats, Campus } from '@/types/superAdmin';

interface SuperAdminContextType {
  // Global filters
  filters: GlobalFilters;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>;
  
  // Data
  campuses: Campus[];
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
  });
  
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('campuses')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCampuses(data as Campus[]);
    }
  }, []);

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
      p_canteen_id: null, // No longer used
    });
    
    if (!error && data) {
      setDashboardStats(data as unknown as DashboardStats);
    }
  }, [filters.campusId]);

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
      fetchPlatformSettings(),
      fetchDashboardStats(),
      fetchPendingCount(),
    ]);
    setIsLoading(false);
  }, [fetchCampuses, fetchPlatformSettings, fetchDashboardStats, fetchPendingCount]);

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
    fetchDashboardStats();
  }, [filters.campusId, fetchDashboardStats]);

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
