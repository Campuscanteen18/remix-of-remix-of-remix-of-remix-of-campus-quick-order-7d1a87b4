import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  ShoppingBag,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types ---
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  verification_status: string;
  rejection_reason?: string | null; // Added rejection reason
  created_at: string;
  items: OrderItem[];
  campus: { name: string };
  canteen: { name: string };
}

export default function MyOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  // --- Fetch Logic ---
  const fetchOrders = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          campus:campuses(name),
          canteen:canteens(name),
          order_items(name, quantity, price)
        `)
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Safe mapping with strict types
      const formattedOrders: Order[] = (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        status: order.status,
        payment_status: order.payment_status,
        verification_status: order.verification_status,
        rejection_reason: order.rejection_reason, 
        created_at: order.created_at,
        campus: order.campus,
        canteen: order.canteen,
        items: order.order_items || []
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  };

  const handleRefresh = () => {
    setIsRefetching(true);
    fetchOrders();
  };

  // --- Real-time Subscription ---
  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('my-orders-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- Helper: Check Expiry (5 Hours) ---
  const isOrderExpired = (createdAtString: string) => {
    const createdAt = new Date(createdAtString);
    const now = new Date();
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    return now.getTime() - createdAt.getTime() > fiveHoursMs;
  };

  // --- UI Helpers ---
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed': return { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' };
      case 'collected': return { label: 'Collected', className: 'bg-gray-100 text-gray-700 border-gray-200' };
      case 'cancelled': return { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' };
      default: return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/menu')} className="shrink-0">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-lg font-bold">My Orders</h1>
              <p className="text-xs text-muted-foreground">Track your food</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefetching}>
            <RefreshCw size={18} className={cn(isRefetching && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Orders List */}
      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {isLoading ? (
          [1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900">No active orders</h3>
            <p className="text-gray-500 text-sm mt-1">Hungry? Place an order now!</p>
            <Button className="mt-4" onClick={() => navigate('/menu')}>Browse Menu</Button>
          </div>
        ) : (
          orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const isExpired = isOrderExpired(order.created_at);
            const isRejected = order.status === 'cancelled' || order.verification_status === 'rejected';

            return (
              <Card key={order.id} className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 bg-white">
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">#{order.order_number}</span>
                          <Badge variant="outline" className={cn("capitalize border", statusConfig.className)}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {format(new Date(order.created_at), 'h:mm a')} • {order.canteen?.name}
                        </p>
                      </div>
                      <span className="font-bold text-lg text-primary">₹{order.total}</span>
                    </div>

                    <Separator className="my-3" />

                    {/* Order Items */}
                    <div className="space-y-1 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.quantity}x {item.name}</span>
                          <span className="font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* --- DYNAMIC FOOTER LOGIC --- */}
                    
                    {/* 1. REJECTED STATE */}
                    {isRejected ? (
                      <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                          <div className="w-full">
                            <p className="font-semibold text-sm text-red-700">Payment Rejected</p>
                            <p className="text-xs text-red-600 mt-0.5">
                              Reason: <span className="font-medium">{order.rejection_reason || "Verification failed"}</span>
                            </p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full mt-3 bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 h-8 text-xs"
                              onClick={() => navigate(`/payment?orderId=${order.id}`)}
                            >
                              Fix & Pay Again
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : order.status === 'confirmed' ? (
                      // 2. CONFIRMED STATE (Check Expiry)
                      isExpired ? (
                        <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 text-center">
                          <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-1">
                            <AlertCircle size={16} /> QR Code Expired
                          </p>
                          {/* FIXED: Replaced '>' with '&gt;' to fix syntax error */}
                          <p className="text-xs text-gray-400 mt-1">Order placed &gt;5 hours ago</p>
                        </div>
                      ) : (
                        <div 
                          className="bg-green-50 p-3 rounded-xl border border-green-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                          onClick={() => navigate(`/payment?orderId=${order.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-1.5 rounded-lg border border-green-100">
                              <QRCodeSVG value={order.id} size={32} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-green-700">Order Ready!</p>
                              <p className="text-xs text-green-600">Tap to view full QR Code</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-green-400" />
                        </div>
                      )
                    ) : (
                      // 3. PENDING STATE
                      <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-center">
                        <p className="text-sm font-medium text-yellow-700 flex items-center justify-center gap-2">
                          <Clock size={16} /> Awaiting Verification
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">Admin is reviewing your payment</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}