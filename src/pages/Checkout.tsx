import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Shield,
  Receipt,
  Wallet,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useStockCheck } from "@/hooks/useStockCheck";
import { useOrders } from "@/hooks/useOrders";
import { EmptyState } from "@/components/EmptyState";
import { Separator } from "@/components/ui/separator";
import { ImageWithFallback } from "@/components/ImageWithFallback";

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, totalPrice, totalItems, clearCart, setCurrentOrder, updateQuantity, removeFromCart } = useCart();
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const { toast } = useToast();
  const { checkStock } = useStockCheck();
  const { createOrder, isCreating } = useOrders();
  
  // Double-submit prevention
  const lastSubmitRef = useRef<number>(0);
  const SUBMIT_COOLDOWN_MS = 5000; // 5 seconds cooldown

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Empty cart - show empty state
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex-shrink-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/menu")}
                className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
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
              onClick: () => navigate("/menu"),
            }}
          />
        </main>
      </div>
    );
  }

  const handleOpenGateway = async () => {
    // Double-submit prevention
    const now = Date.now();
    if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
      toast({
        title: 'Please Wait',
        description: 'Your previous request is still processing.',
      });
      return;
    }
    lastSubmitRef.current = now;
    
    setIsCheckingStock(true);
    setStockError(null);

    try {
      const result = await checkStock(cart);

      if (!result.success) {
        const itemNames = result.unavailableItems.map((item) => item.name).join(", ");

        setStockError(`${itemNames} just sold out.`);

        toast({
          title: "Items Unavailable",
          description: `Sorry! ${itemNames} just sold out.`,
          variant: "destructive",
        });

        result.unavailableItems.forEach((item) => {
          removeFromCart(item.id);
        });

        return;
      }

      await handleUpiPayment();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not verify stock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleUpiPayment = async () => {
    setIsInitiatingPayment(true);

    try {
      const order = await createOrder({
        items: [...cart],
        total: totalPrice,
        paymentMethod: "UPI",
      });

      if (!order) {
        toast({
          title: "Error",
          description: "Could not create order. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setCurrentOrder(order);
      
      // Navigate to payment page with order details
      navigate(`/payment?orderId=${order.id}&amount=${totalPrice}`);
    } catch (error) {
      console.error("UPI payment error:", error);
      toast({
        title: "Error",
        description: "Payment initiation failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/menu")}
              className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
              disabled={isCreating}
            >
              <ArrowLeft size={18} />
            </motion.button>
            <span className="font-semibold text-lg">Checkout</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/10">
            <ShoppingBag size={14} />
            <span className="font-bold text-xs">{totalItems}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-2xl mx-auto w-full px-4 py-6 pb-40 space-y-6"
        >
          {/* Stock Error Alert */}
          <AnimatePresence>
            {stockError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{stockError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Order Items Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground px-1">
              <ShoppingBag size={16} />
              <h2 className="text-sm font-medium uppercase tracking-wider">Order Items</h2>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border/50 divide-y divide-border/50 overflow-hidden">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  className="p-4 flex gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <ImageWithFallback
                      src={item.image || '/placeholder.svg'}
                      alt={item.name}
                      className="h-full w-full rounded-xl object-cover shadow-sm border border-border/50"
                      fallbackIcon
                      containerClassName="h-full w-full"
                    />
                    <div className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shadow-md">
                      x{item.quantity}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-base leading-tight line-clamp-2">{item.name}</h3>
                      <span className="font-bold whitespace-nowrap">₹{item.price * item.quantity}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">₹{item.price} / item</p>

                      <div className="flex items-center bg-secondary/50 rounded-lg p-1 gap-3 border border-border/50">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-md bg-background flex items-center justify-center shadow-sm hover:text-primary disabled:opacity-50"
                          disabled={isCreating}
                        >
                          <Minus size={12} />
                        </motion.button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-sm disabled:opacity-50"
                          disabled={isCreating}
                        >
                          <Plus size={12} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Bill Details Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground px-1">
              <Receipt size={16} />
              <h2 className="text-sm font-medium uppercase tracking-wider">Bill Details</h2>
            </div>

            <motion.div
              variants={itemVariants}
              className="bg-card rounded-2xl shadow-sm border border-border/50 p-5 space-y-3"
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item Total</span>
                <span className="font-medium">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes & Charges</span>
                <span className="text-green-600 text-xs font-medium px-2 py-0.5 bg-green-500/10 rounded-full">
                  FREE
                </span>
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">To Pay</span>
                <span className="font-bold text-xl text-primary">₹{totalPrice}</span>
              </div>
            </motion.div>
          </section>

          {/* Payment Method Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground px-1">
              <Wallet size={16} />
              <h2 className="text-sm font-medium uppercase tracking-wider">Payment Method</h2>
            </div>

            <motion.div variants={itemVariants} className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-green-500/5 rounded-2xl ring-2 ring-green-500 pointer-events-none" />
              <div className="relative p-4 flex items-center gap-4 bg-card rounded-2xl">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-2 flex items-center justify-center shadow-sm">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">UPI Payment</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm & More</p>
                </div>

                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              </div>
            </motion.div>

            <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground/60">
              <Shield size={12} />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Manual Verification</span>
            </div>
          </section>
        </motion.div>
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-50">
        <div className="max-w-2xl mx-auto flex gap-3 items-center">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Total Payable</p>
            <p className="text-2xl font-black text-foreground">₹{totalPrice}</p>
          </div>

          <motion.div className="flex-[1.5]" whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full h-14 rounded-xl text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 transition-all"
              onClick={handleOpenGateway}
              disabled={isCreating || isCheckingStock || isInitiatingPayment}
            >
              {isCheckingStock ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Checking...
                </span>
              ) : isInitiatingPayment ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Pay with UPI <ArrowLeft className="rotate-180" size={18} />
                </span>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
