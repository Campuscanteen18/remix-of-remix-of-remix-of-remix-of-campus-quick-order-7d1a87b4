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
  RefreshCw,
  User,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const isRetryMode = mode === 'retry' && orderIdParam;

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'init' | 'processing' | 'success' | 'failed'>('init');
  const [cashfree, setCashfree] = useState<any>(null);

  // --- NEW: State for User Details ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // 1. Load Cashfree SDK & Fetch Profile Data
  useEffect(() => {
    const initSdk = async () => {
      const cf = await load({
        mode: "production" 
      });
      setCashfree(cf);
    };
    initSdk();

    // --- FETCH PROFILE DATA FROM DB ---
    const fetchProfileData = async () => {
        if (!user) return;

        try {
            // A. Try to get data from 'profiles' table
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('user_id', user.id)
                .maybeSingle();

            // B. Fallback to Auth Metadata
            // FIX: Cast to 'any' to avoid TypeScript error
            const safeUser = user as any;
            const metaName = safeUser.user_metadata?.full_name;
            const metaPhone = safeUser.user_metadata?.phone;

            // C. Set State (Priority: DB > Metadata > Empty)
            if (profile?.full_name) setName(profile.full_name);
            else if (metaName) setName(metaName);

            if (profile?.phone) setPhone(profile.phone);
            else if (metaPhone) setPhone(metaPhone);

        } catch (err) {
            console.error("Error fetching profile:", err);
        }
    };

    fetchProfileData();
  }, [user]);

  // 2. Handle Returns from Payment Gateway
  useEffect(() => {
    if (orderIdParam) {
      verifyPayment(orderIdParam);
    } 
  }, [orderIdParam]);

  // --- 3. START NEW PAYMENT OR RETRY ---
  const handlePayNow = async () => {
    if (!cashfree) return;
    
    // VALIDATION: Phone & Name are required for Cashfree
    if (!phone || phone.length < 10) {
      toast({ 
        title: "Phone Number Required", 
        description: "Please enter a valid phone number for the invoice.", 
        variant: "destructive" 
      });
      return;
    }
    if (!name) {
      toast({ 
        title: "Name Required", 
        description: "Please enter your name.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);

    try {
      const totalAmount = parseFloat(amountParam || "0");
      let orderId: string;

      // If retrying an existing order, use that order ID
      if (isRetryMode && orderIdParam) {
        orderId = orderIdParam;
      } else {
        // Create new order as PENDING
        if (cart.length === 0) {
          navigate('/menu');
          return;
        }

        const newOrder = await createOrder({
          items: cart,
          total: totalAmount,
          paymentMethod: "ONLINE", 
          userId: user?.id,
          user_id: user?.id,
          customerName: name,     // <--- Using State Value
          customerEmail: user?.email,
          status: "pending",
          payment_status: "pending"
        } as any);

        if (!newOrder) throw new Error("Could not create order");
        orderId = newOrder.id;
        
        clearCart();
      }

      // Call Backend to get Cashfree Session
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: orderId,
          amount: totalAmount,
          customerPhone: phone,   // <--- Sending Real Phone
          customerName: name,     // <--- Sending Real Name
          customerId: user?.id
        }
      });

      if (sessionError || !sessionData?.payment_session_id) {
        console.error("Backend Error:", sessionError);
        throw new Error("Failed to contact payment gateway");
      }
      
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
    
    let attempts = 0;
    const maxAttempts = 5;

    const checkStatus = async () => {
      attempts++;
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .single();

      if (order?.payment_status === 'paid') {
        setStatus('success');
      } else if (attempts < maxAttempts) {
        setTimeout(checkStatus, 2000);
      } else {
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
          {/* STATE: INIT - New Payment or Retry */}
          {(status === 'init' && (!orderIdParam || isRetryMode)) && (
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
               <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
                  {isRetryMode && (
                    <p className="text-xs opacity-80 mb-2 uppercase tracking-wider">Retry Payment</p>
                  )}
                  <p className="text-sm opacity-90 font-medium tracking-wide uppercase">Total Payable</p>
                  <p className="text-5xl font-extrabold mt-2 tracking-tight">₹{parseFloat(amountParam || "0").toFixed(0)}</p>
               </div>
               
               <div className="p-6 space-y-4">
                  
                  {/* --- NEW: BILLING DETAILS FORM --- */}
                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <p className="text-sm font-semibold mb-2">Billing Details</p>
                    
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-xs text-muted-foreground">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="name" 
                          placeholder="Your Name" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)}
                          className="pl-9 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          type="tel"
                          placeholder="99999 99999" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  {/* -------------------------------- */}

                  <Button 
                    onClick={handlePayNow} 
                    disabled={isLoading || !phone || !name} 
                    className="w-full h-14 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" size={20}/>}
                    {isLoading ? "Processing..." : isRetryMode ? "Pay Again" : "Pay Securely"}
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