import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStockCheck } from '@/hooks/useStockCheck';
import { useOrders } from '@/hooks/useOrders';
import { EmptyState } from '@/components/EmptyState';
import { supabase } from '@/integrations/supabase/client';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, totalPrice, totalItems, clearCart, setCurrentOrder, updateQuantity, removeFromCart } = useCart();
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isInitiatingPhonePe, setIsInitiatingPhonePe] = useState(false);
  const { toast } = useToast();
  const { checkStock } = useStockCheck();
  const { createOrder, isCreating } = useOrders();

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
      
      // All items available - initiate PhonePe payment
      await handlePhonePePayment();
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

  // Handle PhonePe Sandbox payment
  const handlePhonePePayment = async () => {
    setIsInitiatingPhonePe(true);
    
    try {
      // First create a pending order
      const order = await createOrder({
        items: [...cart],
        total: totalPrice,
        paymentMethod: 'PHONEPE',
      });

      if (!order) {
        toast({
          title: 'Error',
          description: 'Could not create order. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Get current URL for redirect
      const redirectUrl = `${window.location.origin}/order-success?orderId=${order.id}`;

      // Call PhonePe payment edge function
      const { data, error } = await supabase.functions.invoke('phonepe-payment', {
        body: {
          amount: totalPrice,
          orderId: order.id,
          redirectUrl,
        },
      });

      if (error || !data?.success) {
        console.error('Payment initiation error:', error || data?.error);
        toast({
          title: 'Payment Error',
          description: data?.error || 'Could not initiate payment. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Store order info for success page
      setCurrentOrder(order);
      clearCart();

      // Show success toast for demo mode
      if (data.demoMode) {
        toast({
          title: 'Payment Successful!',
          description: 'Demo payment processed. Redirecting...',
        });
      }

      // Redirect to payment page or success page
      if (data.redirectUrl) {
        // For demo mode, use navigate. For real PhonePe, use window.location
        if (data.demoMode) {
          navigate('/order-success');
        } else {
          window.location.href = data.redirectUrl;
        }
      } else {
        navigate('/order-success');
      }
    } catch (error) {
      console.error('PhonePe payment error:', error);
      toast({
        title: 'Error',
        description: 'Payment initiation failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInitiatingPhonePe(false);
    }
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#5f259f]">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" alt="PhonePe" className="h-6 w-auto object-contain" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">PhonePe (Sandbox)</p>
                  <p className="text-xs text-muted-foreground">Automatic verification • Test mode</p>
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
            className="flex-1 h-12 text-lg font-bold rounded-xl bg-[#5f259f] hover:bg-[#4a1d7a] text-white"
            onClick={handleOpenGateway}
            disabled={isCreating || isCheckingStock || isInitiatingPhonePe}
          >
            {isCheckingStock ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Checking Stock...
              </>
            ) : isInitiatingPhonePe ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Connecting to PhonePe...
              </>
            ) : isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" alt="" className="h-5 w-auto mr-2" />
                Pay ₹{totalPrice}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
