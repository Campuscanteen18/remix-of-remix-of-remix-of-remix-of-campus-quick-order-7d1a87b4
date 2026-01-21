import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Smartphone, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Copy,
  Loader2,
  Shield,
  X,
  XCircle,
  ScanLine,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCampus } from '@/context/CampusContext';
import { useCart } from '@/context/CartContext';
import { QRCodeSVG } from 'qrcode.react';

type PaymentStage = 'pay' | 'confirming' | 'verify' | 'submitting' | 'pending' | 'approved' | 'rejected';

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amountParam = searchParams.get('amount'); // Raw string from URL
  
  const { campus } = useCampus();
  const { clearCart } = useCart();
  const { toast } = useToast();
  
  const [stage, setStage] = useState<PaymentStage>('pay');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [orderData, setOrderData] = useState<{ order_number: string; status: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- UPDATED: Using your real UPI ID as the fallback ---
  const upiId = (campus?.settings as { payment?: { upi_id?: string } })?.payment?.upi_id || 'jana20055@axl';
  const merchantName = 'BiteOS';

  // --- 1. ROBUST UPI INTENT GENERATOR ---
  const generateUpiUrl = () => {
    if (!amountParam || !orderId) return '';
    
    // FIX: Strict Amount Formatting (PhonePe requires "20.00", not "20")
    const formattedAmount = parseFloat(amountParam).toFixed(2);
    
    const params = new URLSearchParams();
    params.append('pa', upiId);                      // Payee Address
    params.append('pn', merchantName);               // Payee Name
    params.append('am', formattedAmount);            // Amount (Decimal Fixed)
    params.append('cu', 'INR');                      // Currency
    params.append('tn', `Order ${orderData?.order_number || 'Food'}`); // Note visible to user

    return `upi://pay?${params.toString()}`;
  };

  const upiUrl = generateUpiUrl();

  // --- Device Detection ---
  useEffect(() => {
    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  // --- Compression Logic ---
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
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.6);
      };
      img.onerror = (err) => reject(err);
    });
  };

  useEffect(() => {
    if (!orderId) return;

    const checkOrderStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, order_number, payment_status, verification_status')
        .eq('id', orderId)
        .single();

      if (data) {
        setOrderData({ order_number: data.order_number, status: data.status });
        
        if (data.verification_status === 'approved') {
          setStage('approved');
          clearCart();
        } 
        else if (data.verification_status === 'rejected' || data.status === 'cancelled') {
           setStage('rejected');
        }
      }
    };

    checkOrderStatus();
    if (stage === 'pending') {
        const interval = setInterval(checkOrderStatus, 3000);
        return () => clearInterval(interval);
    }
  }, [stage, orderId, clearCart]);


  const handlePayNow = () => {
    if (!amountParam) return;
    
    // Trigger the UPI Intent
    window.location.href = upiUrl;
    
    // Change UI to "Confirming" state to guide user back
    if (isMobile) {
      setStage('confirming');
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
      } catch (error) {
        console.error("Compression failed", error);
        toast({ title: 'Error', description: 'Could not process image.', variant: 'destructive' });
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitVerification = async () => {
    if (!orderId || !utrNumber || utrNumber.length < 10 || !screenshot) {
      toast({ title: 'Missing Details', description: 'Please fill all fields and upload screenshot.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('PAYMENT-SCREENSHOTS') 
        .upload(fileName, screenshot);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('PAYMENT-SCREENSHOTS')
        .getPublicUrl(fileName);
        
      const screenshotUrl = urlData.publicUrl;

      const { error } = await supabase
        .from('orders')
        .update({
          utr_number: utrNumber.trim(),
          verification_status: 'pending',
          payment_status: 'pending',
          notes: `Screenshot: ${screenshotUrl}`, 
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({ title: 'Verification Submitted', description: 'Please wait for approval.' });
      setStage('pending');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({ 
        title: 'Submission Failed', 
        description: error.message || 'Could not submit.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast({ title: 'Copied!', description: 'UPI ID copied' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-emerald-50 dark:from-green-950/20 dark:via-background dark:to-emerald-950/20 flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/checkout')} className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center">
              <ArrowLeft size={18} />
            </motion.button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <Shield size={14} /> <span className="font-bold text-xs">Secure Payment</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* STAGE 1: PAY */}
          {stage === 'pay' && (
            <motion.div key="pay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-90" />
                  <p className="text-sm opacity-80">Pay via UPI</p>
                  <p className="text-4xl font-bold mt-1">₹{parseFloat(amountParam || '0').toFixed(2)}</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* UPI ID Display */}
                  <div className="p-4 bg-muted/50 rounded-xl border border-border/50 flex justify-between items-center">
                     <div>
                       <p className="text-xs text-muted-foreground uppercase font-medium">UPI ID</p>
                       <p className="font-mono font-bold text-lg">{upiId}</p>
                     </div>
                     <Button variant="ghost" size="sm" onClick={copyUpiId}><Copy size={16}/></Button>
                  </div>

                  {isMobile ? (
                    // MOBILE: Pay Button
                    <Button onClick={handlePayNow} className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg">
                      Pay Now with App
                    </Button>
                  ) : (
                    // DESKTOP: QR Code
                    <div className="text-center space-y-4">
                      <div className="bg-white p-4 rounded-xl border inline-block shadow-sm">
                        <QRCodeSVG value={upiUrl} size={180} level="M" />
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <ScanLine size={16} /> Scan with any UPI App
                      </p>
                      <Button onClick={() => setStage('verify')} className="w-full h-12 font-bold rounded-xl">
                        I Have Paid
                      </Button>
                    </div>
                  )}

                  {isMobile && (
                    <button onClick={() => setStage('verify')} className="w-full text-sm text-primary hover:underline py-2">
                      Enter details manually
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 1.5: CONFIRMING (New Mobile Interstitial) */}
          {stage === 'confirming' && (
            <motion.div key="confirming" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Smartphone className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Completing Payment...</h2>
                <p className="text-muted-foreground mb-6">
                  We've opened your UPI app. Once you complete the payment, come back here.
                </p>
                
                <div className="space-y-3">
                  <Button onClick={() => setStage('verify')} className="w-full h-12 font-bold rounded-xl bg-primary">
                    I Have Paid <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setStage('pay')} className="w-full text-muted-foreground">
                    Cancel / Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 2: VERIFY */}
          {stage === 'verify' && (
            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center gap-3">
                  <button onClick={() => setStage('pay')}><ArrowLeft size={18} /></button>
                  <h2 className="font-semibold">Verify Payment</h2>
                  <span className="ml-auto font-bold text-green-600">₹{parseFloat(amountParam || '0').toFixed(2)}</span>
                </div>

                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="utr">UTR / Reference Number <span className="text-destructive">*</span></Label>
                    <Input id="utr" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Enter 12-digit UTR" className="h-12 font-mono text-lg" maxLength={12} />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Screenshot <span className="text-destructive">*</span></Label>
                    {!screenshotPreview ? (
                      <div onClick={() => !isCompressing && fileInputRef.current?.click()} className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors">
                        {isCompressing ? (
                          <div className="flex flex-col items-center justify-center py-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                            <p className="text-xs text-muted-foreground">Compressing image...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload proof (Required)</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-border/50">
                        <img src={screenshotPreview} alt="Preview" className="w-full h-40 object-cover" />
                        <button onClick={removeScreenshot} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center"><X size={16} /></button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>

                  <Button 
                    onClick={handleSubmitVerification} 
                    disabled={!utrNumber || utrNumber.length < 10 || !screenshot || isSubmitting || isCompressing} 
                    className="w-full h-14 font-bold rounded-xl"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Verification'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: PENDING */}
          {stage === 'pending' && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
                <p className="text-muted-foreground mb-6">Waiting for admin approval...</p>
                <div className="p-4 bg-muted/50 rounded-xl mb-6 flex items-center justify-center gap-2">
                   <Loader2 className="animate-spin text-amber-600" size={16} />
                   <span className="text-sm font-medium text-amber-600">Please wait 2-5 mins</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE 4: REJECTED */}
          {stage === 'rejected' && (
             <motion.div key="rejected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Rejected</h2>
                <p className="text-muted-foreground mb-6">Admin rejected the UTR provided.</p>
                <Button onClick={() => setStage('verify')} className="w-full h-12 font-bold mb-3">Try Again</Button>
                <Button variant="ghost" onClick={() => navigate('/menu')} className="w-full">Cancel Order</Button>
              </div>
            </motion.div>
          )}

          {/* STAGE 5: APPROVED */}
          {stage === 'approved' && orderData && (
            <motion.div key="approved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Order Confirmed!</h2>
                <p className="text-muted-foreground mb-6">Show QR at counter.</p>
                <div className="bg-white p-6 rounded-2xl inline-block shadow-sm border mb-6">
                  <QRCodeSVG value={orderId || ''} size={180} />
                </div>
                <Button className="w-full" onClick={() => navigate('/my-orders')}>View My Orders</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}