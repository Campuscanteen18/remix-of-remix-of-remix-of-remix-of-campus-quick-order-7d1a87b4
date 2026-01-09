import { ArrowLeft, Smartphone, Minus, Plus, Trash2, ShoppingBag, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useCart } from '@/context/CartContext';
import { useCampus } from '@/context/CampusContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useStockCheck } from '@/hooks/useStockCheck';
import { useOrders } from '@/hooks/useOrders';
import { EmptyState } from '@/components/EmptyState';
import { PaymentGatewayModal } from '@/components/PaymentGatewayModal';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, totalPrice, totalItems, clearCart, setCurrentOrder, updateQuantity, removeFromCart } = useCart();
  const { settings } = useCampus();
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const { toast } = useToast();
  const { checkStock } = useStockCheck();
  const { createOrder, isCreating } = useOrders();

  // Get payment settings from campus
  const paymentSettings = settings?.payment;
  const paymentProvider = paymentSettings?.provider || 'upi';

  // Empty cart - show empty state
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex-shrink-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/menu')}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <Logo size="sm" />
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Add some items from the menu to checkout"
            action={{
              label: "Browse Menu",
              onClick: () => navigate('/menu'),
            }}
          />
        </main>
      </div>
    );
  }

  // Final stock check before opening payment gateway
  const handleOpenGateway = async () => {
    setIsCheckingStock(true);
    setStockError(null);
    
    try {
      const result = await checkStock(cart);
      
      if (!result.success) {
        const itemNames = result.unavailableItems.map(item => item.name).join(', ');
        
        setStockError(`${itemNames} just sold out.`);
        
        toast({
          title: 'Items Unavailable',
          description: `Sorry! ${itemNames} just sold out.`,
          variant: 'destructive',
        });
        
        // Auto-remove unavailable items from cart
        result.unavailableItems.forEach(item => {
          removeFromCart(item.id);
        });
        
        return;
      }
      
      // All items available - handle based on payment provider
      if (paymentProvider === 'razorpay' && paymentSettings?.razorpay_key) {
        handleRazorpayPayment();
      } else if (paymentProvider === 'upi' && paymentSettings?.upi_id) {
        setShowUpiQr(true);
      } else {
        // Open PhonePe/Paytm gateway modal
        setShowGatewayModal(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not verify stock. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingStock(false);
    }
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!paymentSettings?.razorpay_key) {
      toast({
        title: 'Configuration Error',
        description: 'Payment gateway not configured for this campus.',
        variant: 'destructive',
      });
      return;
    }

    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const options = {
        key: paymentSettings.razorpay_key,
        amount: totalPrice * 100, // Amount in paise
        currency: settings?.operational?.currency || 'INR',
        name: 'Campus Canteen',
        description: `Order - ${totalItems} items`,
        handler: async (response: { razorpay_payment_id: string }) => {
          // Payment successful
          await handlePaymentSuccess('RAZORPAY', response.razorpay_payment_id);
        },
        prefill: {},
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
  };

  // Handle UPI confirmation
  const handleUpiConfirm = async () => {
    setShowUpiQr(false);
    await handlePaymentSuccess('UPI');
  };

  // Common payment success handler
  const handlePaymentSuccess = async (provider: string, paymentId?: string) => {
    toast({
      title: 'Processing order...',
      description: 'Please wait while we confirm your order.',
    });

    const order = await createOrder({
      items: [...cart],
      total: totalPrice,
      paymentMethod: provider,
    });

    if (order) {
      setCurrentOrder(order);
      clearCart();
      navigate('/order-success');
    } else {
      toast({
        title: 'Order Failed',
        description: 'Could not process your order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Gateway payment success callback
  const handleGatewaySuccess = async (gateway: string, transactionId: string) => {
    console.log(`Payment successful via ${gateway}, TXN: ${transactionId}`);
    await handlePaymentSuccess(gateway, transactionId);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/menu')}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors active:scale-95"
              disabled={isCreating}
            >
              <ArrowLeft size={20} />
            </button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary text-primary">
            <ShoppingBag size={16} />
            <span className="font-medium text-sm">{totalItems} items</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-2xl mx-auto w-full pb-6">
          <h1 className="text-2xl font-bold mb-6">Checkout</h1>
          
          {/* Stock Error Alert */}
          {stockError && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{stockError}</p>
            </div>
          )}
          
          {/* Order Summary */}
          <section className="bg-card rounded-2xl overflow-hidden card-shadow mb-6">
            {/* Green header */}
            <div className="p-4 bg-secondary text-secondary-foreground">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="font-bold">Order Summary</h2>
              </div>
            </div>

            <div className="divide-y divide-border">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50"
                        disabled={isCreating}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold min-w-[1.5rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                        disabled={isCreating}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-2 w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                        disabled={isCreating}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="font-bold text-lg">Total</span>
              <span className="text-primary font-bold text-2xl">₹{totalPrice}</span>
            </div>
          </section>

          {/* Payment Options */}
          <section className="bg-card rounded-2xl overflow-hidden card-shadow">
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-lg">Payment Method</h2>
            </div>

            <div className="p-4 space-y-3">
              <div className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5">
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                  <Smartphone size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">UPI (PhonePe, Paytm, GPay, & more)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" alt="PhonePe" className="h-4 w-auto object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/1200px-Paytm_Logo_%28standalone%29.svg.png" alt="Paytm" className="h-4 w-auto object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/1200px-Google_Pay_Logo.svg.png" alt="GPay" className="h-4 w-auto object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="flex-shrink-0 p-4 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="h-12 px-8 rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => navigate('/menu')}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 h-12 text-lg font-bold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            onClick={handleOpenGateway}
            disabled={isCreating || isCheckingStock}
          >
            {isCheckingStock ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Checking Stock...
              </>
            ) : isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Pay ₹${totalPrice}`
            )}
          </Button>
        </div>
      </div>

      {/* UPI QR Code Modal */}
      <Dialog open={showUpiQr} onOpenChange={setShowUpiQr}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Scan to Pay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
              <QrCode size={120} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with any UPI app<br />
              <span className="font-mono text-foreground">{paymentSettings?.upi_id}</span>
            </p>
            <p className="text-2xl font-bold text-primary">₹{totalPrice}</p>
            <Button 
              className="w-full h-12 font-bold rounded-xl"
              onClick={handleUpiConfirm}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'I have paid'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PhonePe/Paytm Gateway Modal */}
      <PaymentGatewayModal
        open={showGatewayModal}
        onOpenChange={setShowGatewayModal}
        amount={totalPrice}
        onSuccess={handleGatewaySuccess}
        onCancel={() => setShowGatewayModal(false)}
      />
    </div>
  );
}
