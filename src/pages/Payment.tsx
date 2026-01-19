import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Smartphone, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  Loader2,
  Shield,
  FileImage,
  X
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

type PaymentStage = 'pay' | 'verify' | 'submitting' | 'pending' | 'approved';

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  
  const { campus } = useCampus();
  const { clearCart } = useCart();
  const { toast } = useToast();
  
  const [stage, setStage] = useState<PaymentStage>('pay');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderData, setOrderData] = useState<{ order_number: string; status: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UPI payment details - fetch from campus settings
  const upiId = (campus?.settings as { payment?: { upi_id?: string } })?.payment?.upi_id || 'biteos@upi';
  const merchantName = 'BiteOS';

  // Poll for order status after submission
  useEffect(() => {
    if (stage !== 'pending' || !orderId) return;

    const checkOrderStatus = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, order_number, payment_status, verification_status')
        .eq('id', orderId)
        .single();

      if (data) {
        setOrderData({ order_number: data.order_number, status: data.status });
        
        // If payment is verified/approved, show success
        if (data.verification_status === 'approved' && data.payment_status === 'paid') {
          setStage('approved');
          clearCart();
        }
      }
    };

    // Check immediately
    checkOrderStatus();

    // Then poll every 5 seconds
    const interval = setInterval(checkOrderStatus, 5000);
    return () => clearInterval(interval);
  }, [stage, orderId, clearCart]);

  const handlePayNow = () => {
    if (!amount) return;
    
    // Construct UPI deep link
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId?.slice(-8) || 'Payment'}`)}`;
    
    // Redirect to UPI app
    window.location.href = upiUrl;
    
    // After redirect attempt, show verification form
    setTimeout(() => {
      setStage('verify');
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image under 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitVerification = async () => {
    if (!orderId) {
      toast({
        title: 'Error',
        description: 'Order ID is missing',
        variant: 'destructive',
      });
      return;
    }

    if (!utrNumber || utrNumber.length < 10) {
      toast({
        title: 'Invalid UTR',
        description: 'Please enter a valid 12-digit UTR/Reference number',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot if provided
      let screenshotUrl = null;
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${orderId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('payment-screenshots')
          .upload(fileName, screenshot);

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
          // Don't fail the whole process if screenshot upload fails
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('payment-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // Update order with UTR and verification status
      const { error } = await supabase
        .from('orders')
        .update({
          utr_number: utrNumber.trim(),
          verification_status: 'pending',
          payment_status: 'pending',
          notes: screenshotUrl ? `Screenshot: ${screenshotUrl}` : null,
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Verification Submitted',
        description: 'Your payment is being verified. You will receive your QR code shortly.',
      });

      setStage('pending');
    } catch (error) {
      console.error('Verification submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast({
      title: 'Copied!',
      description: 'UPI ID copied to clipboard',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-emerald-50 dark:from-green-950/20 dark:via-background dark:to-emerald-950/20 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/checkout')}
              className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft size={18} />
            </motion.button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <Shield size={14} />
            <span className="font-bold text-xs">Secure Payment</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Stage: Pay Now */}
          {stage === 'pay' && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                {/* Amount Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-90" />
                  <p className="text-sm opacity-80">Pay via UPI</p>
                  <p className="text-4xl font-bold mt-1">₹{amount || '0'}</p>
                  <p className="text-xs opacity-60 mt-2">Order #{orderId?.slice(-8)}</p>
                </div>

                <div className="p-6 space-y-4">
                  {/* UPI ID Display */}
                  <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1.5 uppercase font-medium">Pay to UPI ID</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono font-bold text-lg">{upiId}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyUpiId}
                        className="h-8 px-2"
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  <Button
                    onClick={handlePayNow}
                    className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                  >
                    <Smartphone className="mr-2" size={20} />
                    Pay ₹{amount} Now
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    This will open your UPI app (GPay, PhonePe, Paytm, etc.)
                  </p>

                  {/* Already Paid Link */}
                  <button
                    onClick={() => setStage('verify')}
                    className="w-full text-sm text-primary hover:underline py-2"
                  >
                    Already paid? Enter UTR number
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage: Verification Form */}
          {stage === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center gap-3">
                  <button onClick={() => setStage('pay')} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={18} />
                  </button>
                  <h2 className="font-semibold">Verify Payment</h2>
                  <span className="ml-auto font-bold text-green-600">₹{amount}</span>
                </div>

                <div className="p-6 space-y-5">
                  {/* UTR Input */}
                  <div className="space-y-2">
                    <Label htmlFor="utr" className="text-sm font-medium">
                      UTR / Reference Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="utr"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="Enter 12-digit UTR number"
                      className="h-12 font-mono text-lg"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in your UPI app under transaction details
                    </p>
                  </div>

                  {/* Screenshot Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Payment Screenshot <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    
                    {!screenshotPreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                      >
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload screenshot
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-border/50">
                        <img
                          src={screenshotPreview}
                          alt="Payment screenshot"
                          className="w-full h-40 object-cover"
                        />
                        <button
                          onClick={removeScreenshot}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={!utrNumber || utrNumber.length < 10 || isSubmitting}
                    className="w-full h-14 text-base font-bold rounded-xl"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={18} />
                        Submitting...
                      </span>
                    ) : (
                      'Submit Verification'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage: Pending Verification */}
          {stage === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
                  <p className="text-muted-foreground mb-6">
                    Your payment is being verified. This usually takes 2-5 minutes.
                  </p>

                  <div className="p-4 bg-muted/50 rounded-xl mb-6">
                    <div className="flex items-center justify-center gap-2 text-amber-600">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="text-sm font-medium">Waiting for admin approval...</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>UTR: <span className="font-mono font-medium text-foreground">{utrNumber}</span></p>
                    <p>Amount: <span className="font-medium text-foreground">₹{amount}</span></p>
                    {orderData?.order_number && (
                      <p>Order: <span className="font-mono font-medium text-foreground">#{orderData.order_number}</span></p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-muted/30 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/my-orders')}
                  >
                    View My Orders
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage: Approved - Show QR Code */}
          {stage === 'approved' && orderData && (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Verified!</h2>
                  <p className="text-muted-foreground mb-6">
                    Show this QR code at the counter to collect your order.
                  </p>

                  {/* QR Code */}
                  <div className="bg-white p-6 rounded-2xl inline-block shadow-sm border">
                    <QRCodeSVG
                      value={orderId || ''}
                      size={180}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="text-2xl font-bold font-mono">#{orderData.order_number}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 border-t border-border/50 space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => navigate('/my-orders')}
                  >
                    View My Orders
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/menu')}
                  >
                    Order More
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
