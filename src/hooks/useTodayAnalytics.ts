import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCampus } from '@/context/CampusContext';

// ... (Interfaces remain the same) ...
interface TimePeriodStats {
  period: string;
  periodId: string;
  orders: number;
  revenue: number;
  percentage: number;
  isActive: boolean;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface HourlyData {
  hour: string;
  orders: number;
  revenue: number;
}

interface TodayAnalytics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  periodBreakdown: TimePeriodStats[];
  topItems: TopItem[];
  hourlyData: HourlyData[];
  peakHour: string;
  completionRate: number;
  pendingOrders: number;
  confirmedOrders: number;
  activeOrders: number;
  collectedOrders: number;
  currentPeriod: string;
  dateString: string;
}

// ... (Helper functions remain the same) ...
const getTimePeriod = (hour: number): string => {
  if (hour >= 7 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snacks';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'other';
};

const periodNames: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${suffix}`;
};

export function useTodayAnalytics() {
  const { campus } = useCampus();

  return useQuery({
    queryKey: ['today-analytics', campus?.id],
    queryFn: async (): Promise<TodayAnalytics> => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentPeriod = getTimePeriod(currentHour);
      const dateString = now.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

      const createDefaultData = (): TodayAnalytics => ({
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        periodBreakdown: ['breakfast', 'lunch', 'snacks', 'dinner'].map(period => ({
          period: periodNames[period],
          periodId: period,
          orders: 0,
          revenue: 0,
          percentage: 0,
          isActive: period === currentPeriod,
        })),
        topItems: [],
        hourlyData: [],
        peakHour: '-',
        completionRate: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        activeOrders: 0,
        collectedOrders: 0,
        currentPeriod: periodNames[currentPeriod] || 'Off Hours',
        dateString,
      });

      if (!campus?.id) return createDefaultData();

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, total, created_at, status,
          order_items (name, quantity, price)
        `)
        .eq('campus_id', campus.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (error) {
        console.error('Error fetching today analytics:', error);
        return createDefaultData();
      }

      const ordersList = orders || [];

      // ✅ FIX: "Completed" means MONEY RECEIVED (Confirmed or Collected)
      // We filter out 'pending', 'cancelled', 'failed' for Revenue Stats
      const paidOrders = ordersList.filter(o => o.status === 'confirmed' || o.status === 'collected');
      const collectedOrdersList = ordersList.filter(o => o.status === 'collected');

      // Calculate totals based ONLY on Paid Orders
      const totalOrders = paidOrders.length;
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
      
      // Completion rate is (Collected / Total Paid Orders)
      const completionRate = paidOrders.length > 0 
        ? Math.round((collectedOrdersList.length / paidOrders.length) * 100) 
        : 0;

      // Status counts (for the dashboard badges)
      const pendingOrders = ordersList.filter(o => o.status === 'pending').length;
      const confirmedOrders = ordersList.filter(o => o.status === 'confirmed').length;
      // "Active" usually means things the kitchen needs to worry about (Confirmed but not collected)
      const activeOrders = confirmedOrders; 

      const periodStats: Record<string, { orders: number; revenue: number }> = {
        breakfast: { orders: 0, revenue: 0 },
        lunch: { orders: 0, revenue: 0 },
        snacks: { orders: 0, revenue: 0 },
        dinner: { orders: 0, revenue: 0 },
      };

      const hourCounts: Record<number, { orders: number; revenue: number }> = {};
      for (let h = 7; h <= 22; h++) {
        hourCounts[h] = { orders: 0, revenue: 0 };
      }

      const itemCounts: Record<string, { quantity: number; revenue: number }> = {};

      // ✅ FIX: Only iterate over PAID orders for charts/graphs
      paidOrders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const hour = orderDate.getHours();
        const period = getTimePeriod(hour);

        if (periodStats[period]) {
          periodStats[period].orders += 1;
          periodStats[period].revenue += Number(order.total);
        }

        if (hourCounts[hour]) {
          hourCounts[hour].orders += 1;
          hourCounts[hour].revenue += Number(order.total);
        }

        const items = order.order_items as Array<{ name: string; quantity: number; price: number }> || [];
        items.forEach((item) => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { quantity: 0, revenue: 0 };
          }
          itemCounts[item.name].quantity += item.quantity;
          itemCounts[item.name].revenue += item.price * item.quantity;
        });
      });

      const periodBreakdown: TimePeriodStats[] = ['breakfast', 'lunch', 'snacks', 'dinner'].map(period => ({
        period: periodNames[period],
        periodId: period,
        orders: periodStats[period].orders,
        revenue: periodStats[period].revenue,
        percentage: totalOrders > 0 ? Math.round((periodStats[period].orders / totalOrders) * 100) : 0,
        isActive: period === currentPeriod,
      }));

      const topItems: TopItem[] = Object.entries(itemCounts)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const hourlyData: HourlyData[] = [];
      for (let h = 7; h <= 21; h++) {
        hourlyData.push({
          hour: formatHour(h),
          orders: hourCounts[h]?.orders || 0,
          revenue: hourCounts[h]?.revenue || 0,
        });
      }

      let peakHourVal = 0;
      let peakHourCount = 0;
      Object.entries(hourCounts).forEach(([hour, stats]) => {
        if (stats.orders > peakHourCount) {
          peakHourCount = stats.orders;
          peakHourVal = parseInt(hour);
        }
      });
      const peakHour = peakHourCount > 0 ? formatHour(peakHourVal) : '-';

      return {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        periodBreakdown,
        topItems,
        hourlyData,
        peakHour,
        completionRate,
        pendingOrders,
        confirmedOrders,
        activeOrders,
        collectedOrders: collectedOrdersList.length,
        currentPeriod: periodNames[currentPeriod] || 'Off Hours',
        dateString,
      };
    },
    enabled: !!campus?.id,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}