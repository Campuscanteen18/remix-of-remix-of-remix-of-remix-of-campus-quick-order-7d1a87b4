import { useState, useEffect, useCallback } from 'react';

interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  todayOrders: number;
}

interface ChartDataPoint {
  day: string;
  revenue: number;
  orders: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

interface UseAdminDashboardReturn {
  stats: AdminStats;
  chartData: ChartDataPoint[];
  menuItems: MenuItem[];
  isLoading: boolean;
  error: string | null;
  timeRange: 'daily' | 'weekly' | 'monthly';
  setTimeRange: (range: 'daily' | 'weekly' | 'monthly') => void;
  refetch: () => Promise<void>;
  toggleItemAvailability: (itemId: string) => Promise<boolean>;
}

// Mock data generators
const generateChartData = (range: string): ChartDataPoint[] => {
  const baseData = [
    { day: 'Mon', revenue: 2400, orders: 24 },
    { day: 'Tue', revenue: 1398, orders: 13 },
    { day: 'Wed', revenue: 9800, orders: 98 },
    { day: 'Thu', revenue: 3908, orders: 39 },
    { day: 'Fri', revenue: 4800, orders: 48 },
    { day: 'Sat', revenue: 3800, orders: 38 },
    { day: 'Sun', revenue: 4300, orders: 43 },
  ];
  
  // Modify based on time range
  if (range === 'daily') {
    return baseData.slice(0, 1).map(d => ({ ...d, day: 'Today' }));
  }
  if (range === 'monthly') {
    return baseData.map((d, i) => ({ ...d, day: `Week ${i + 1}` }));
  }
  return baseData;
};

const generateMenuItems = (): MenuItem[] => [
  { id: '1', name: 'Chicken Biryani', price: 120, category: 'main-course', isAvailable: true },
  { id: '2', name: 'Veg Biryani', price: 90, category: 'main-course', isAvailable: true },
  { id: '3', name: 'Samosa', price: 15, category: 'snacks', isAvailable: true },
  { id: '4', name: 'Masala Dosa', price: 50, category: 'breakfast', isAvailable: false },
  { id: '5', name: 'Chai', price: 15, category: 'beverages', isAvailable: true },
];

/**
 * Hook for admin dashboard data
 * TODO: Replace with real Supabase queries when Cloud is enabled
 */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const [stats, setStats] = useState<AdminStats>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    todayOrders: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // TODO: Replace with real Supabase queries
      // const { data: statsData } = await supabase.rpc('get_dashboard_stats', { time_range: timeRange });
      // const { data: chartData } = await supabase.rpc('get_revenue_chart', { time_range: timeRange });
      // const { data: menuData } = await supabase.from('menu_items').select('*');
      
      setStats({
        totalRevenue: 28406,
        totalOrders: 303,
        avgOrderValue: 94,
        todayOrders: 43,
      });
      
      setChartData(generateChartData(timeRange));
      setMenuItems(generateMenuItems());
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleItemAvailability = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // TODO: Replace with real Supabase update
      // const { error } = await supabase
      //   .from('menu_items')
      //   .update({ is_available: !currentValue })
      //   .eq('id', itemId);
      
      setMenuItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, isAvailable: !item.isAvailable }
            : item
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error toggling availability:', err);
      return false;
    }
  }, []);

  return {
    stats,
    chartData,
    menuItems,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    refetch: fetchData,
    toggleItemAvailability,
  };
}
