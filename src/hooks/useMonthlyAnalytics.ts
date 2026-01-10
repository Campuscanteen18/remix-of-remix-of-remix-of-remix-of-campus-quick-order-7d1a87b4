import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCampus } from '@/context/CampusContext';

interface TimePeriodStats {
  period: string;
  orders: number;
  revenue: number;
}

interface DailyTrend {
  date: string;
  day: number;
  orders: number;
  revenue: number;
}

interface MonthlyAnalytics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  periodBreakdown: TimePeriodStats[];
  dailyTrends: DailyTrend[];
  monthName: string;
  year: number;
}

// Get time period from hour
const getTimePeriod = (hour: number): string => {
  if (hour >= 7 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snacks';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'other';
};

export function useMonthlyAnalytics() {
  const { campus } = useCampus();

  return useQuery({
    queryKey: ['monthly-analytics', campus?.id],
    queryFn: async (): Promise<MonthlyAnalytics> => {
      if (!campus?.id) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          periodBreakdown: [],
          dailyTrends: [],
          monthName: '',
          year: 0,
        };
      }

      // Get current month boundaries
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, created_at, status')
        .eq('campus_id', campus.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;

      const ordersList = orders || [];

      // Calculate totals
      const totalOrders = ordersList.length;
      const totalRevenue = ordersList.reduce((sum, o) => sum + Number(o.total), 0);
      const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      // Period breakdown
      const periodStats: Record<string, { orders: number; revenue: number }> = {
        breakfast: { orders: 0, revenue: 0 },
        lunch: { orders: 0, revenue: 0 },
        snacks: { orders: 0, revenue: 0 },
        dinner: { orders: 0, revenue: 0 },
      };

      ordersList.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        const period = getTimePeriod(hour);
        if (periodStats[period]) {
          periodStats[period].orders += 1;
          periodStats[period].revenue += Number(order.total);
        }
      });

      const periodBreakdown: TimePeriodStats[] = [
        { period: 'Breakfast', ...periodStats.breakfast },
        { period: 'Lunch', ...periodStats.lunch },
        { period: 'Snacks', ...periodStats.snacks },
        { period: 'Dinner', ...periodStats.dinner },
      ];

      // Daily trends for the month
      const daysInMonth = monthEnd.getDate();
      const dailyTrends: DailyTrend[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), day);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), day, 23, 59, 59);

        const dayOrders = ordersList.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= dayStart && orderDate <= dayEnd;
        });

        dailyTrends.push({
          date: `${day}`,
          day,
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
        });
      }

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

      return {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        periodBreakdown,
        dailyTrends,
        monthName: monthNames[now.getMonth()],
        year: now.getFullYear(),
      };
    },
    enabled: !!campus?.id,
  });
}
