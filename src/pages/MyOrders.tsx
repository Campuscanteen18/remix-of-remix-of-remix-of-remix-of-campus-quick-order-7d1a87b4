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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Order Placed', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
      ready: { label: 'Ready for Pickup', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
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

              {/* QR Code Section */}
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
            </div>
          );
        })}
      </main>
    </div>
  );
}
