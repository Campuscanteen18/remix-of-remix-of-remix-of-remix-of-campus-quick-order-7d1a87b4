import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { load } from "@cashfreepayments/cashfree-js"; 
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Loader2, 
  Shield, 
  CheckCircle2,
  XCircle,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/hooks/useOrders";

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createOrder } = useOrders();

  // URL Params
  const mode = searchParams.get("mode"); 
  const orderIdParam = searchParams.get("order_id");
  const amountParam = searchParams.get("amount");

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'init' | 'processing' | 'success' | 'failed'>('init');
  const [cashfree, setCashfree] = useState<any>(null);

  // 1. Load Cashfree SDK
  useEffect(() => {
    const initSdk = async () => {
      const cf = await load({
        mode: "production" // Production Mode
      });
      setCashfree(cf);
    };
    initSdk();
  }, []);

  // 2. Handle Returns from Payment Gateway
  useEffect(() => {
    if (orderIdParam) {
      verifyPayment(orderIdParam);
    } 
  }, [orderIdParam]);

  // --- 3. START NEW PAYMENT (FIXED) ---
  const handlePayNow = async () => {
    if (!cashfree) return;
    if (cart.length === 0 && mode === 'create') {
      navigate('/menu');
      return;
    }

    setIsLoading(true);

    try {
      const userData = user as any;
      const customerName = userData?.user_metadata?.full_name || "Student";
      const totalAmount = parseFloat(amountParam || "0");

      // 🛑 FIX: Create Order as PENDING first
      // This prevents "Free Food" if user cancels payment
      const newOrder = await createOrder({
        items: cart,
        total: totalAmount,
        paymentMethod: "ONLINE", 
        userId: user?.id,
        user_id: user?.id,
        customerName: customerName,
        customerEmail: user?.email,
        status: "pending",          // <--- Kitchen won't cook it yet
        payment_status: "pending"   // <--- Money not received yet
      } as any);

      if (!newOrder) throw new Error("Could not create order");

      // B. Call Backend to get Session
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: newOrder.id,
          amount: newOrder.total,
          customerPhone: "9999999999", 
          customerName: customerName
        }
      });

      if (sessionError || !sessionData?.payment_session_id) {
        console.error("Backend Error:", sessionError);
        throw new Error("Failed to contact payment gateway");
      }

      // C. Clear Cart & Redirect
      clearCart();
      
      const checkoutOptions = {
        paymentSessionId: sessionData.payment_session_id,
        redirectTarget: "_self" as const,
      };
      
      await cashfree.checkout(checkoutOptions);

    } catch (error: any) {
      console.error("Payment Init Error:", error);
      toast({ title: "Payment Error", description: "Could not initiate payment. Try again.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  // --- 4. VERIFY PAYMENT STATUS ---
  const verifyPayment = async (orderId: string) => {
    setStatus('processing');
    
    // Check DB every 2 seconds (Max 5 attempts) to see if Webhook updated it
    let attempts = 0;
    const maxAttempts = 5;

    const checkStatus = async () => {
      attempts++;
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .single();

      // If Webhook has updated it to 'paid', show Success
      if (order?.payment_status === 'paid') {
        setStatus('success');
      } else if (attempts < maxAttempts) {
        // Not updated yet? Wait 2s and try again
        setTimeout(checkStatus, 2000);
      } else {
        // Timed out (Webhook delayed or Payment Failed)
        setStatus('failed'); 
      }
    };

    checkStatus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/menu')} className="rounded-full">
              <ArrowLeft size={18} />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <Shield size={14} /> <span className="font-bold text-xs">Secure Payment</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* STATE: INIT */}
          {(status === 'init' && !orderIdParam) && (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
               <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
                  <p className="text-sm opacity-90 font-medium tracking-wide uppercase">Total Payable</p>
                  <p className="text-5xl font-extrabold mt-2 tracking-tight">₹{parseFloat(amountParam || "0").toFixed(0)}</p>
               </div>
               <div className="p-6 space-y-4">
                  <Button 
                    onClick={handlePayNow} 
                    disabled={isLoading}
                    className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" size={20}/>}
                    {isLoading ? "Processing..." : "Pay Securely"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Secured by Cashfree Payments. <br/> UPI, Cards, and Netbanking supported.
                  </p>
               </div>
            </div>
          )}

          {/* STATE: PROCESSING */}
          {(status === 'processing') && (
            <div className="text-center space-y-4 py-12">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-bold">Verifying Payment...</h2>
              <p className="text-muted-foreground">Please do not close this window.</p>
            </div>
          )}

          {/* STATE: SUCCESS */}
          {status === 'success' && (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">Your order has been placed and sent to the kitchen.</p>
              <Button className="w-full font-bold h-12" onClick={() => navigate('/my-orders')}>
                View Order Status
              </Button>
            </div>
          )}

          {/* STATE: FAILED */}
          {status === 'failed' && (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                 We couldn't confirm the payment yet. <br/>
                 If money was deducted, it will be updated automatically.
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full gap-2" onClick={() => verifyPayment(orderIdParam!)}>
                   <RefreshCw size={16} /> Check Status Again
                </Button>
                <Button className="w-full font-bold" onClick={() => navigate('/my-orders')}>
                   Go to My Orders
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}