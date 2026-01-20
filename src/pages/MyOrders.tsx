import { useState } from 'react';
import { ArrowLeft, Clock, ShoppingBag, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OrderSkeletonList } from '@/components/skeletons/OrderSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useOrders } from '@/hooks/useOrders';

export default function MyOrders() {
  const navigate = useNavigate();
  const { activeOrders, isLoading, error, refetch } = useOrders();
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  // Check if order is expired (older than 5 hours)
  const isOrderExpired = (createdAt: Date) => {
    const now = new Date();
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    return now.getTime() - createdAt.getTime() > fiveHoursMs;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Simplified token system status badges
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      confirmed: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      collected: { label: 'Collected', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
      cancelled: { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/menu')}
              className="shrink-0"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-lg font-bold">My Orders</h1>
              <p className="text-xs text-muted-foreground">Track your active orders</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="shrink-0"
          >
            <RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </header>

      {/* Orders List */}
      <main className="p-4 space-y-4 pb-8">
        {/* Loading State */}
        {isLoading && <OrderSkeletonList count={2} />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            message={error}
            onRetry={refetch}
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && activeOrders.length === 0 && (
          <EmptyState
            icon={ShoppingBag}
            title="No Active Orders"
            description="Your orders will appear here once you place them"
            action={{
              label: "Browse Menu",
              onClick: () => navigate('/menu'),
            }}
          />
        )}

        {/* Orders */}
        {!isLoading && !error && activeOrders.map((order) => {
          const status = getStatusBadge(order.status);
          
          return (
            <div 
              key={order.id} 
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              {/* Order Header */}
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-base">{order.qrCode || order.id}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      Placed at {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.color}`}>
                    <span className="text-xs font-medium">{status.label}</span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Order Items */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{order.total}</span>
                </div>
              </div>

              {/* QR Code Section - Only show for paid orders */}
              {order.paymentStatus === 'completed' || order.paymentStatus === 'paid' ? (
                isOrderExpired(order.createdAt) ? (
                  // Expired QR Code
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 border-t border-red-200 dark:border-red-800">
                    <p className="text-sm text-center text-red-700 dark:text-red-400 font-medium">
                      ❌ QR Code Expired
                    </p>
                    <p className="text-xs text-center text-red-600 dark:text-red-500 mt-1">
                      This token has expired after 5 hours. Please contact the canteen staff.
                    </p>
                    <div className="flex justify-center mt-3">
                      <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl opacity-50 grayscale">
                        <QRCodeSVG 
                          value={order.qrCode}
                          size={100}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2 font-mono line-through">
                      {order.qrCode || order.id}
                    </p>
                  </div>
                ) : (
                  // Valid QR Code
                  <div className="bg-muted/50 p-4 border-t border-border">
                    <p className="text-xs text-center text-muted-foreground mb-3">
                      Show this QR code at the counter for pickup
                    </p>
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-xl shadow-sm">
                        <QRCodeSVG 
                          value={order.qrCode}
                          size={140}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-3 font-mono">
                      {order.qrCode || order.id}
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 border-t border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-center text-yellow-700 dark:text-yellow-400 font-medium">
                    ⏳ Awaiting Payment Confirmation
                  </p>
                  <p className="text-xs text-center text-yellow-600 dark:text-yellow-500 mt-1">
                    QR code will appear after payment is verified
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
