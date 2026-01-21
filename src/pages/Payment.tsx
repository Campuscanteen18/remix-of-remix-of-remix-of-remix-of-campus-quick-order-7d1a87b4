import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Smartphone, Upload, CheckCircle2, Clock, Copy, Loader2, Shield, X, XCircle, ArrowRight, ChevronDown, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCampus } from '@/context/CampusContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders'; 
import { QRCodeSVG } from 'qrcode.react';
import { AppLauncher } from '@capacitor/app-launcher'; 

type PaymentStage = 'loading' | 'pay' | 'manual_help' | 'verify' | 'submitting' | 'pending' | 'approved' | 'rejected';

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mode = searchParams.get('mode'); 
  const orderIdParam = searchParams.get('orderId');
  const amountParam = searchParams.get('amount');
  
  const { campus } = useCampus();
  const { cart, clearCart, setCurrentOrder } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createOrder } = useOrders(); 
  
  const [stage, setStage] = useState<PaymentStage>('loading');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amountParam || '0');
  
  const [activeOrderId, setActiveOrderId] = useState<string | null>(orderIdParam);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upiId = (campus?.settings as { payment?: { upi_id?: string } })?.payment?.upi_id || 'paytmqr5hyajm@ptys';
  const merchantName = 'BiteOS';

  const generateUpiUrl = () => {
    if (!displayAmount) return '';
    const formattedAmount = parseFloat(displayAmount).toFixed(2);
    const params = new URLSearchParams();
    params.append('pa', upiId);
    params.append('pn', merchantName);
    params.append('am', formattedAmount);
    params.append('cu', 'INR');
    params.append('tn', 'Food Order'); 
    return `upi://pay?${params.toString()}`;
  };

  const upiUrl = generateUpiUrl();

  useEffect(() => {
    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  useEffect(() => {
    if (mode === 'create') {
        if (!amountParam || (cart.length === 0)) {
            navigate('/menu'); 
            return;
        }
        setStage('pay');
        setDisplayAmount(amountParam);
    } 
    else if (activeOrderId) {
        checkExistingOrderStatus();
        const interval = setInterval(checkExistingOrderStatus, 3000);
        return () => clearInterval(interval);
    }
  }, [mode, activeOrderId]);

  const checkExistingOrderStatus = async () => {
    if (!activeOrderId) return;
    
    // FIX: Cast the response to 'any' to silence TypeScript errors
    const { data } = await supabase
      .from('orders')
      .select('status, verification_status, amount')
      .eq('id', activeOrderId)
      .single() as any;

    if (data) {
       if (data.amount) setDisplayAmount(data.amount.toString());
       
       if (data.verification_status === 'approved') setStage('approved');
       else if (data.verification_status === 'pending') setStage('pending');
       else if (data.verification_status === 'rejected') setStage('rejected');
       else setStage('pay');
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas error')); return; }
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
        canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg', lastModified: Date.now() });
          resolve(compressedFile);
        }, 'image/jpeg', 0.6);
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handlePayNow = async () => {
    try {
      await AppLauncher.openUrl({ url: upiUrl });
      if (isMobile) setStage('verify');
    } catch (e) {
      console.log("Deep link failed");
      setStage('manual_help');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(file);
        setScreenshot(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => { setScreenshotPreview(reader.result as string); };
        reader.readAsDataURL(compressedFile);
      } catch (error) { toast({ title: 'Error', description: 'Could not process image.', variant: 'destructive' }); } finally { setIsCompressing(false); }
    }
  };

  const removeScreenshot = () => { setScreenshot(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleSubmitVerification = async () => {
    if (!utrNumber || utrNumber.length < 10 || !screenshot) { 
        toast({ title: 'Missing Details', description: 'Please fill all fields and upload screenshot.', variant: 'destructive' }); 
        return; 
    }

    setIsSubmitting(true);

    try {
      const fileExt = screenshot.name.split('.').pop();
      const tempId = activeOrderId || `temp-${Date.now()}`;
      const fileName = `${tempId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('PAYMENT-SCREENSHOTS').upload(fileName, screenshot);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      
      const { data: urlData } = supabase.storage.from('PAYMENT-SCREENSHOTS').getPublicUrl(fileName);
      const screenshotUrl = urlData.publicUrl;

      if (mode === 'create') {
          const userData = user as any;
          const customerName = userData?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

          const newOrder = await createOrder({
            items: cart,
            total: parseFloat(displayAmount),
            paymentMethod: "UPI",
            userId: user?.id,
            user_id: user?.id,
            customerName: customerName,
            customerEmail: user?.email,
          } as any);

          if (!newOrder) throw new Error("Order creation failed");

          const { error: updateError } = await supabase
            .from('orders')
            .update({
              utr_number: utrNumber.trim(),
              verification_status: 'pending', 
              payment_status: 'pending',
              status: 'pending',
              notes: `Screenshot: ${screenshotUrl}`
            })
            .eq('id', newOrder.id);

          if (updateError) console.error("Update failed", updateError);

          setCurrentOrder(newOrder as any);
          setActiveOrderId(newOrder.id);
          clearCart(); 

      } else if (activeOrderId) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
                utr_number: utrNumber.trim(), 
                verification_status: 'pending', 
                payment_status: 'pending', 
                notes: `Screenshot: ${screenshotUrl}` 
            })
            .eq('id', activeOrderId);
            
          if (updateError) throw updateError;
      }

      toast({ title: 'Verification Submitted', description: 'Please wait for approval.' }); 
      setStage('pending');

    } catch (error: any) { 
        console.error('Submission error:', error);
        toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' }); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const copyUpiId = () => { navigator.clipboard.writeText(upiId); toast({ title: 'Copied!', description: 'UPI ID copied' }); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-emerald-50 dark:from-green-950/20 dark:via-background dark:to-emerald-950/20 flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/my-orders')} className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center"> <ArrowLeft size={18} /> </motion.button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20"> <Shield size={14} /> <span className="font-bold text-xs">Secure Payment</span> </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {stage === 'loading' && (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading...</p>
             </motion.div>
          )}

          {stage === 'pay' && (
            <motion.div key="pay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-8 text-white text-center">
                  <p className="text-sm opacity-90 font-medium tracking-wide uppercase">Total Payable</p>
                  <p className="text-5xl font-extrabold mt-2 tracking-tight">₹{parseFloat(displayAmount).toFixed(0)}</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Button onClick={handlePayNow} className="w-full h-16 text-lg font-bold rounded-2xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 flex items-center justify-between px-6 transition-all active:scale-[0.98]">
                      <span>Pay with UPI App</span>
                      <ArrowRight size={20} className="opacity-80" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Supports PhonePe, GPay, Paytm, etc.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or pay manually</span>
                    </div>
                  </div>

                  <div onClick={() => setStage('manual_help')} className="group border border-border/60 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-muted/30 hover:border-primary/30 transition-all">
                     <div className="w-12 h-12 bg-white rounded-lg p-1 border shadow-sm flex items-center justify-center">
                        <QRCodeSVG value={upiUrl} size={38} />
                     </div>
                     <div className="flex-1">
                        <h3 className="font-semibold text-sm">Show QR Code / UPI ID</h3>
                        <p className="text-xs text-muted-foreground">Scan screenshot or copy ID</p>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <ChevronDown size={16} />
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'manual_help' && (
            <motion.div key="manual_help" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center gap-2 bg-muted/20">
                  <button onClick={() => setStage('pay')}><ArrowLeft size={18} /></button>
                  <span className="font-semibold text-sm">Manual Payment</span>
                </div>
                
                <div className="p-6 text-center space-y-6">
                   <div className="bg-white p-4 rounded-2xl border shadow-sm inline-block">
                      <QRCodeSVG value={upiUrl} size={160} level="M" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-sm font-medium">Take a Screenshot & Scan</p>
                      <p className="text-xs text-muted-foreground px-4">Screenshot this QR, then open PhonePe/GPay scanner and select "Image".</p>
                   </div>
                   <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">- OR -</div>
                   <div onClick={copyUpiId} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50 cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="text-left overflow-hidden">
                         <p className="text-[10px] text-muted-foreground font-bold uppercase">UPI ID</p>
                         <p className="font-mono font-bold text-sm truncate pr-2">{upiId}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="h-8">Copy</Button>
                   </div>
                   <Button onClick={() => setStage('verify')} className="w-full h-14 font-bold rounded-xl text-lg mt-2">
                     I Have Paid
                   </Button>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'verify' && (
            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center gap-3">
                  <button onClick={() => setStage('manual_help')}><ArrowLeft size={18} /></button>
                  <h2 className="font-semibold">Confirm Payment</h2>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="utr">UTR / Ref Number</Label>
                    <Input id="utr" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Ex: 405829..." className="h-12 font-mono text-lg bg-muted/20" maxLength={12} />
                    <p className="text-[10px] text-muted-foreground">Found in payment details of your UPI app.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Attach Screenshot</Label>
                    {!screenshotPreview ? (
                      <div onClick={() => !isCompressing && fileInputRef.current?.click()} className="border-2 border-dashed border-border/50 rounded-xl h-32 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors bg-muted/10">
                        {isCompressing ? ( <Loader2 className="w-6 h-6 animate-spin text-primary" /> ) : ( <> <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 text-blue-600"> <Camera size={20} /> </div> <span className="text-sm font-medium text-blue-600">Tap to Upload</span> </> )}
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-border/50 h-40 bg-black"> <img src={screenshotPreview} alt="Preview" className="w-full h-full object-contain" /> <button onClick={removeScreenshot} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"><X size={16} /></button> </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                  <Button onClick={handleSubmitVerification} disabled={!utrNumber || utrNumber.length < 10 || !screenshot || isSubmitting} className="w-full h-14 font-bold rounded-xl text-lg shadow-lg shadow-primary/20"> {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Order & Verify'} </Button>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'pending' && ( <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md"> <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center"> <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4"> <Clock className="w-10 h-10 text-amber-500" /> </div> <h2 className="text-2xl font-bold mb-2">Verification Pending</h2> <p className="text-muted-foreground mb-6">Waiting for admin approval...</p> <div className="p-4 bg-muted/50 rounded-xl mb-6 flex items-center justify-center gap-2"> <Loader2 className="animate-spin text-amber-600" size={16} /> <span className="text-sm font-medium text-amber-600">Please wait 2-5 mins</span> </div> </div> </motion.div> )}
          {stage === 'rejected' && ( <motion.div key="rejected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md"> <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center"> <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4"> <XCircle className="w-10 h-10 text-red-500" /> </div> <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Rejected</h2> <p className="text-muted-foreground mb-6">Admin rejected the UTR provided.</p> <Button onClick={() => setStage('verify')} className="w-full h-12 font-bold mb-3">Try Again</Button> <Button variant="ghost" onClick={() => navigate('/menu')} className="w-full">Cancel Order</Button> </div> </motion.div> )}
          {stage === 'approved' && ( <motion.div key="approved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md"> <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center"> <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"> <CheckCircle2 className="w-10 h-10 text-green-500" /> </div> <h2 className="text-2xl font-bold text-green-600 mb-2">Order Confirmed!</h2> <p className="text-muted-foreground mb-6">Show QR at counter.</p> <div className="bg-white p-6 rounded-2xl inline-block shadow-sm border mb-6"> <QRCodeSVG value={activeOrderId || ''} size={180} /> </div> <Button className="w-full" onClick={() => navigate('/my-orders')}>View My Orders</Button> </div> </motion.div> )}
        </AnimatePresence>
      </main>
    </div>
  );
}