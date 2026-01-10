import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCampus } from '@/context/CampusContext';

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
  preparingOrders: number;
  readyOrders: number;
  collectedOrders: number;
  currentPeriod: string;
  dateString: string;
}

// Get time period from hour
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

const periodTimes: Record<string, string> = {
  breakfast: '7 AM - 11 AM',
  lunch: '11 AM - 3 PM',
  snacks: '3 PM - 6 PM',
  dinner: '6 PM - 10 PM',
};

export function useTodayAnalytics() {
  const { campus } = useCampus();

  return useQuery({
    queryKey: ['today-analytics', campus?.id],
    queryFn: async (): Promise<TodayAnalytics> => {
      if (!campus?.id) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          periodBreakdown: [],
          topItems: [],
          hourlyData: [],
          peakHour: '-',
          completionRate: 0,
          pendingOrders: 0,
          preparingOrders: 0,
          readyOrders: 0,
          collectedOrders: 0,
          currentPeriod: '',
          dateString: '',
        };
      }

      // Get today's boundaries
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Current time period
      const currentHour = now.getHours();
      const currentPeriod = getTimePeriod(currentHour);

      // Format date string
      const dateString = now.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

      // Fetch orders with items
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, total, created_at, status,
          order_items (name, quantity, price)
        `)
        .eq('campus_id', campus.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (error) throw error;

      const ordersList = orders || [];
      const completedOrders = ordersList.filter(o => o.status !== 'cancelled');
      const collectedOrders = ordersList.filter(o => o.status === 'collected');

      // Calculate totals
      const totalOrders = completedOrders.length;
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
      const completionRate = ordersList.length > 0 
        ? Math.round((collectedOrders.length / ordersList.length) * 100) 
        : 0;

      // Order status counts
      const pendingOrders = ordersList.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
      const preparingOrders = ordersList.filter(o => o.status === 'preparing').length;
      const readyOrders = ordersList.filter(o => o.status === 'ready').length;

      // Period breakdown
      const periodStats: Record<string, { orders: number; revenue: number }> = {
        breakfast: { orders: 0, revenue: 0 },
        lunch: { orders: 0, revenue: 0 },
        snacks: { orders: 0, revenue: 0 },
        dinner: { orders: 0, revenue: 0 },
      };

      // Hour counts for peak hour and hourly chart
      const hourCounts: Record<number, { orders: number; revenue: number }> = {};
      for (let h = 7; h <= 22; h++) {
        hourCounts[h] = { orders: 0, revenue: 0 };
      }

      // Item counts for top items
      const itemCounts: Record<string, { quantity: number; revenue: number }> = {};

      completedOrders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const hour = orderDate.getHours();
        const period = getTimePeriod(hour);

        // Period stats
        if (periodStats[period]) {
          periodStats[period].orders += 1;
          periodStats[period].revenue += Number(order.total);
        }

        // Hour counts
        if (hourCounts[hour]) {
          hourCounts[hour].orders += 1;
          hourCounts[hour].revenue += Number(order.total);
        }

        // Item counts
        (order.order_items || []).forEach((item: { name: string; quantity: number; price: number }) => {
          if (!itemCounts[item.name]) {
            itemCounts[item.name] = { quantity: 0, revenue: 0 };
          }
          itemCounts[item.name].quantity += item.quantity;
          itemCounts[item.name].revenue += item.price * item.quantity;
        });
      });

      // Format period breakdown with percentages
      const periodBreakdown: TimePeriodStats[] = ['breakfast', 'lunch', 'snacks', 'dinner'].map(period => ({
        period: periodNames[period],
        periodId: period,
        orders: periodStats[period].orders,
        revenue: periodStats[period].revenue,
        percentage: totalOrders > 0 ? Math.round((periodStats[period].orders / totalOrders) * 100) : 0,
        isActive: period === currentPeriod,
      }));

      // Top 5 items
      const topItems: TopItem[] = Object.entries(itemCounts)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Hourly data for chart
      const formatHour = (hour: number) => {
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const h = hour % 12 || 12;
        return `${h}${suffix}`;
      };

      const hourlyData: HourlyData[] = [];
      for (let h = 7; h <= 21; h++) {
        hourlyData.push({
          hour: formatHour(h),
          orders: hourCounts[h]?.orders || 0,
          revenue: hourCounts[h]?.revenue || 0,
        });
      }

      // Peak hour
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
        preparingOrders,
        readyOrders,
        collectedOrders: collectedOrders.length,
        currentPeriod: periodNames[currentPeriod] || 'Off Hours',
        dateString,
      };
    },
    enabled: !!campus?.id,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });
}
