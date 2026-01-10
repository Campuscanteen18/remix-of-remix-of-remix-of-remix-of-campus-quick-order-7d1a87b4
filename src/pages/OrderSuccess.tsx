import { useEffect, useState, useRef } from 'react';
import { CheckCircle, Home, QrCode, MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface OrderData {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string | null;
  customer_name: string | null;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrder, setCurrentOrder, clearCart } = useCart();
  const cartCleared = useRef(false);
  
  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const orderId = searchParams.get('orderId') || currentOrder?.id;

  // Verify payment status from server
  useEffect(() => {
    if (!orderId) {
      navigate('/menu');
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 10;

    const verifyPayment = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            total,
            status,
            payment_status,
            customer_name,
            created_at,
            order_items (
              id,
              name,
              price,
              quantity
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
          setVerificationState('failed');
          return;
        }

        const order: OrderData = {
          id: data.id,
          order_number: data.order_number,
          total: Number(data.total),
          status: data.status,
          payment_status: data.payment_status,
          customer_name: data.customer_name,
          created_at: data.created_at,
          items: data.order_items || [],
        };

        setOrderData(order);

        // Check if payment is confirmed
        if (data.payment_status === 'paid' || data.payment_status === 'completed') {
          setVerificationState('success');
          clearInterval(pollInterval);
          
          // Clear the cart after payment is verified (only once)
          if (!cartCleared.current) {
            cartCleared.current = true;
            clearCart();
          }
          
          // Show QR after verification success animation
          setTimeout(() => setShowQR(true), 800);
        } else if (attempts >= maxAttempts) {
          // Payment still pending after max attempts
          setVerificationState('pending');
          clearInterval(pollInterval);
        } else {
          attempts++;
        }
      } catch (err) {
        console.error('Verification error:', err);
        setVerificationState('failed');
        clearInterval(pollInterval);
      }
    };

    // Initial check
    verifyPayment();

    // Poll every 2 seconds for payment confirmation
    pollInterval = setInterval(verifyPayment, 2000);

    return () => clearInterval(pollInterval);
  }, [orderId, navigate, retryCount]);

  const handleRetry = () => {
    setVerificationState('verifying');
    setRetryCount(prev => prev + 1);
  };

  // No order ID available
  if (!orderId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center px-4 h-16 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <Logo size="sm" />
      </header>

      <main className="flex-1 p-4 lg:p-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* Verifying Payment State */}
          {verificationState === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground text-center">
                Please wait while we confirm your payment...
              </p>
            </motion.div>
          )}

          {/* Payment Pending State */}
          {verificationState === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment Pending</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-xs">
                Your payment is still being processed. Please complete the payment or try again.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/menu')}>
                  Back to Menu
                </Button>
                <Button onClick={handleRetry} className="gap-2">
                  <RefreshCw size={16} />
                  Check Again
                </Button>
              </div>
            </motion.div>
          )}

          {/* Payment Failed State */}
          {verificationState === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Verification Failed</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-xs">
                We couldn't verify your payment. Please contact support if this persists.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/menu')}>
                  Back to Menu
                </Button>
                <Button onClick={handleRetry} className="gap-2">
                  <RefreshCw size={16} />
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}

          {/* Payment Success State */}
          {verificationState === 'success' && orderData && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Success Animation */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-4"
                >
                  <CheckCircle className="w-12 h-12 text-green-500" strokeWidth={2} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Payment Verified!
                  </h1>
                  <p className="text-muted-foreground">
                    Order: <span className="font-mono font-semibold text-foreground">{orderData.order_number}</span>
                  </p>
                </motion.div>
              </div>

              {/* QR Code Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card rounded-3xl overflow-hidden shadow-xl border border-border/50"
              >
                <div className="p-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Your Collection QR</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Show this at the canteen counter
                  </p>
                </div>

                {/* QR Code */}
                <div className="p-8 flex justify-center bg-gradient-to-b from-transparent to-muted/20">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={showQR ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="p-4 bg-white rounded-2xl shadow-lg"
                  >
                    <QRCodeSVG
                      value={orderData.order_number}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </motion.div>
                </div>

                {/* Order Details */}
                <div className="p-6 bg-muted/30">
                  <h3 className="font-bold mb-3">Order Details</h3>
                  <div className="space-y-2">
                    {orderData.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t border-border font-bold">
                      <span>Total Paid</span>
                      <span className="text-green-600 text-lg">₹{orderData.total}</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-6 border-t border-border">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    How to collect
                  </h3>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                      Go to the canteen counter
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                      Show this QR code to staff
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                      Collect your printed receipt
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                      Hand receipt to get your food
                    </li>
                  </ol>
                </div>

                {/* Warning */}
                <div className="mx-6 mb-6 p-4 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm font-medium text-center border border-amber-500/20">
                  ⚠️ This QR code can only be used once
                </div>

                <div className="p-6 pt-0">
                  <Button
                    className="w-full h-14 text-lg font-bold rounded-2xl gap-2"
                    onClick={() => navigate('/menu')}
                  >
                    <Home size={20} />
                    Order More
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
