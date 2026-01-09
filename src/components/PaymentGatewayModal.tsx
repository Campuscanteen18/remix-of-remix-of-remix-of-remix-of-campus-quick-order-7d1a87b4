import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Smartphone, Wallet, AlertCircle, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PaymentStatus = 'selecting' | 'processing' | 'success' | 'failed';
type Gateway = 'phonepe' | 'paytm' | null;

interface PaymentGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onSuccess: (gateway: string, transactionId: string) => void;
  onCancel: () => void;
}

export function PaymentGatewayModal({
  open,
  onOpenChange,
  amount,
  onSuccess,
  onCancel,
}: PaymentGatewayModalProps) {
  const [selectedGateway, setSelectedGateway] = useState<Gateway>(null);
  const [status, setStatus] = useState<PaymentStatus>('selecting');
  const [progress, setProgress] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedGateway(null);
      setStatus('selecting');
      setProgress(0);
    }
  }, [open]);

  // Simulate payment processing
  const handleGatewaySelect = async (gateway: Gateway) => {
    setSelectedGateway(gateway);
    setStatus('processing');
    setProgress(0);

    // Simulate processing with progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 300);

    // Simulate payment completion (2-3 seconds)
    const processingTime = 2000 + Math.random() * 1000;
    
    await new Promise((resolve) => setTimeout(resolve, processingTime));
    
    clearInterval(progressInterval);
    setProgress(100);

    // 95% success rate for demo
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      setStatus('success');
      // Generate mock transaction ID
      const txnId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Auto-close after success
      setTimeout(() => {
        onSuccess(gateway?.toUpperCase() || 'UPI', txnId);
        onOpenChange(false);
      }, 1500);
    } else {
      setStatus('failed');
    }
  };

  const handleRetry = () => {
    setSelectedGateway(null);
    setStatus('selecting');
    setProgress(0);
  };

  const handleClose = () => {
    if (status === 'processing') return; // Prevent closing during processing
    onCancel();
    onOpenChange(false);
  };

  const gatewayConfig = {
    phonepe: {
      name: 'PhonePe',
      color: '#5f259f',
      bgColor: 'bg-[#5f259f]',
      icon: Smartphone,
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png',
    },
    paytm: {
      name: 'Paytm',
      color: '#00baf2',
      bgColor: 'bg-[#00baf2]',
      icon: Wallet,
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/1200px-Paytm_Logo_%28standalone%29.svg.png',
    },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {status === 'selecting' && 'Choose Payment App'}
            {status === 'processing' && `Paying via ${selectedGateway ? gatewayConfig[selectedGateway].name : ''}`}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Gateway Selection */}
          {status === 'selecting' && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4 py-4"
            >
              <div className="text-center mb-2">
                <span className="text-3xl font-bold text-primary">₹{amount}</span>
                <p className="text-sm text-muted-foreground mt-1">Sandbox/Test Mode</p>
              </div>

              <button
                onClick={() => handleGatewaySelect('phonepe')}
                className="flex items-center gap-4 p-5 rounded-xl border-2 border-[#5f259f] bg-card hover:bg-[#5f259f]/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#5f259f]/10">
                  <img 
                    src={gatewayConfig.phonepe.logo} 
                    alt="PhonePe" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-lg font-bold text-[#5f259f]">PhonePe</span>
                  <p className="text-xs text-muted-foreground">UPI Payment</p>
                </div>
                <QrCode size={24} className="text-[#5f259f]/50" />
              </button>

              <button
                onClick={() => handleGatewaySelect('paytm')}
                className="flex items-center gap-4 p-5 rounded-xl border-2 border-[#00baf2] bg-card hover:bg-[#00baf2]/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#00baf2]/10">
                  <img 
                    src={gatewayConfig.paytm.logo} 
                    alt="Paytm" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-lg font-bold text-[#00baf2]">Paytm</span>
                  <p className="text-xs text-muted-foreground">Wallet & UPI</p>
                </div>
                <QrCode size={24} className="text-[#00baf2]/50" />
              </button>

              <p className="text-xs text-center text-muted-foreground mt-2">
                🧪 Demo mode - no real payment will be processed
              </p>
            </motion.div>
          )}

          {/* Processing State */}
          {status === 'processing' && selectedGateway && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-6 py-8"
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${gatewayConfig[selectedGateway].color}15` }}
              >
                <Loader2 
                  size={40} 
                  className="animate-spin" 
                  style={{ color: gatewayConfig[selectedGateway].color }}
                />
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold">Processing Payment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait, do not close this window...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: gatewayConfig[selectedGateway].color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {Math.min(Math.round(progress), 100)}%
                </p>
              </div>

              <span className="text-2xl font-bold">₹{amount}</span>
            </motion.div>
          )}

          {/* Success State */}
          {status === 'success' && selectedGateway && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <CheckCircle2 size={48} className="text-green-500" />
              </motion.div>

              <div className="text-center">
                <p className="text-xl font-bold text-green-600">Payment Successful!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Paid via {gatewayConfig[selectedGateway].name}
                </p>
              </div>

              <span className="text-3xl font-bold text-primary">₹{amount}</span>

              <p className="text-xs text-muted-foreground">
                Redirecting to order confirmation...
              </p>
            </motion.div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle size={48} className="text-destructive" />
              </div>

              <div className="text-center">
                <p className="text-xl font-bold text-destructive">Payment Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Something went wrong. Please try again.
                </p>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRetry}
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
