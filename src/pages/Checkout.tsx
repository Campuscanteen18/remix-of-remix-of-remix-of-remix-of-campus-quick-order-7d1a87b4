import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Loader2, AlertCircle, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

      // Redirect to PhonePe simulator or real payment page
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/menu')}
              className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
              disabled={isCreating}
            >
              <ArrowLeft size={20} />
            </motion.button>
            <Logo size="sm" />
          </div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            <ShoppingBag size={16} />
            <span className="font-semibold text-sm">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          </motion.div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 lg:py-8 pb-32">
          {/* Page Title */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
            <p className="text-muted-foreground mt-1">Review your order and complete payment</p>
          </motion.div>
          
          {/* Stock Error Alert */}
          {stockError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive"
            >
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{stockError}</p>
            </motion.div>
          )}
          
          {/* Order Summary */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-3xl overflow-hidden shadow-lg border border-border/50 mb-6"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-secondary to-secondary/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-secondary-foreground">Order Summary</h2>
                  <p className="text-xs text-secondary-foreground/70">{totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart</p>
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="divide-y divide-border/50">
              {cart.map((item, index) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow-md"
                    />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">₹{item.price} × {item.quantity}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-50 shadow-sm"
                        disabled={isCreating}
                      >
                        <Minus size={14} />
                      </motion.button>
                      <span className="font-bold min-w-[2rem] text-center text-lg">{item.quantity}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md disabled:opacity-50"
                        disabled={isCreating}
                      >
                        <Plus size={14} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeFromCart(item.id)}
                        className="ml-3 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                        disabled={isCreating}
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xl">₹{item.price * item.quantity}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-5 bg-muted/30 border-t border-border/50">
              <div>
                <span className="text-muted-foreground text-sm">Order Total</span>
                <p className="font-bold text-2xl text-primary">₹{totalPrice}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock size={14} />
                <span>Est. 15-20 min</span>
              </div>
            </div>
          </motion.section>

          {/* Payment Method */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-3xl overflow-hidden shadow-lg border border-border/50 mb-6"
          >
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="font-bold text-lg">Payment Method</h2>
              <p className="text-sm text-muted-foreground">Choose how you'd like to pay</p>
            </div>

            <div className="p-4">
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#5f259f] bg-[#5f259f]/5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full border-2 border-[#5f259f] flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 rounded-full bg-[#5f259f]" 
                  />
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#5f259f] shadow-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" alt="PhonePe" className="h-7 w-auto object-contain" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-lg">PhonePe</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Sandbox Mode</span>
                    <span className="text-xs text-muted-foreground">• Auto verification</span>
                  </div>
                </div>
                <CheckCircle2 className="w-6 h-6 text-[#5f259f]" />
              </motion.div>
            </div>
          </motion.section>

          {/* Security Note */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
          >
            <Shield size={14} />
            <span>Your payment is secure and encrypted</span>
          </motion.div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="h-14 px-6 rounded-2xl font-bold text-muted-foreground border-border hover:bg-muted hover:text-foreground transition-all"
            onClick={() => navigate('/menu')}
            disabled={isCreating}
          >
            Back to Menu
          </Button>
          <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button 
              className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-[#5f259f] to-[#7b3cc3] hover:from-[#4a1d7a] hover:to-[#5f259f] text-white shadow-lg shadow-[#5f259f]/25 transition-all"
              onClick={handleOpenGateway}
              disabled={isCreating || isCheckingStock || isInitiatingPhonePe}
            >
              {isCheckingStock ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Checking availability...
                </>
              ) : isInitiatingPhonePe ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Connecting to PhonePe...
                </>
              ) : isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing order...
                </>
              ) : (
                <>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" alt="" className="h-6 w-auto mr-3" />
                  Pay ₹{totalPrice}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
