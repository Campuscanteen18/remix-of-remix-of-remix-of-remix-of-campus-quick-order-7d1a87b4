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
  CreditCard
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
  const orderIdParam = searchParams.get("order_id"); // Returned by Cashfree
  const amountParam = searchParams.get("amount");

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'init' | 'processing' | 'success' | 'failed'>('init');
  const [cashfree, setCashfree] = useState<any>(null);

  // 1. Load Cashfree SDK on mount
  useEffect(() => {
    const initSdk = async () => {
      const cf = await load({
        mode: "production" // ⚠️ CHANGE TO "production" BEFORE GOING LIVE
      });
      setCashfree(cf);
    };
    initSdk();
  }, []);

  // 2. Handle Returns or New Payments
  useEffect(() => {
    if (orderIdParam) {
      // User is returning from Cashfree payment page
      verifyPayment(orderIdParam);
    } 
  }, [orderIdParam]);

  // --- LOGIC: START NEW PAYMENT ---
  const handlePayNow = async () => {
    if (!cashfree) return;
    if (cart.length === 0 && mode === 'create') {
      navigate('/menu');
      return;
    }

    setIsLoading(true);

    try {
      // A. Create Pending Order in Supabase
      const userData = user as any;
      const customerName = userData?.user_metadata?.full_name || "Student";
      
      // Calculate total ensuring 2 decimal places
      const totalAmount = parseFloat(amountParam || "0");

      const newOrder = await createOrder({
        items: cart,
        total: totalAmount,
        paymentMethod: "ONLINE", // Marking as Online/Cashfree
        userId: user?.id,
        user_id: user?.id,
        customerName: customerName,
        customerEmail: user?.email,
      } as any);

      if (!newOrder) throw new Error("Could not create order");

      // B. Call Your Backend to get Payment Session
      // We will create this 'create-payment' function in the next step
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: newOrder.id,
          amount: newOrder.total,
          customerPhone: "9999999999", // Replace with real phone if available
          customerName: customerName
        }
      });

      if (sessionError || !sessionData?.payment_session_id) {
        console.error("Backend Error:", sessionError);
        throw new Error("Failed to contact payment gateway");
      }

      // C. Clear Cart & Redirect to Cashfree
      clearCart();
      
      const checkoutOptions = {
        paymentSessionId: sessionData.payment_session_id,
        redirectTarget: "_self" as const, // Open in same tab
      };
      
      await cashfree.checkout(checkoutOptions);

    } catch (error: any) {
      console.error("Payment Init Error:", error);
      toast({ title: "Payment Error", description: "Could not initiate payment. Try again.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  // --- LOGIC: VERIFY PAYMENT STATUS ---
  const verifyPayment = async (orderId: string) => {
    setStatus('processing');
    
    // Simple check: Allow database webhook 2-3 seconds to update status
    setTimeout(async () => {
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();

      if (order?.payment_status === 'paid') {
        setStatus('success');
      } else {
        setStatus('failed'); 
      }
    }, 2000);
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
          {/* STATE: INIT (Show Pay Button) */}
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
                    className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
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

          {/* STATE: PROCESSING RETURN */}
          {(status === 'processing') && (
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-bold">Verifying Payment...</h2>
              <p className="text-muted-foreground">Please wait a moment.</p>
            </div>
          )}

          {/* STATE: SUCCESS */}
          {status === 'success' && (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">Your order has been placed.</p>
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
              <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">We could not verify your payment.</p>
              <Button className="w-full font-bold h-12" onClick={() => navigate('/menu')}>
                Try Again
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}