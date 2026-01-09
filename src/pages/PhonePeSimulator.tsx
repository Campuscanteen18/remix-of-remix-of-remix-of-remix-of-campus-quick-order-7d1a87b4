import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Smartphone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function PhonePeSimulator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const txnId = searchParams.get('txnId');
  
  const [stage, setStage] = useState<'loading' | 'confirm' | 'processing' | 'success'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setStage('confirm'), 1500);
    return () => clearTimeout(timer);
  }, []);

  const markOrderAsPaid = async () => {
    if (!orderId) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'paid',
        status: 'confirmed',
        payment_method: 'PHONEPE_SANDBOX',
        notes: `Sandbox TXN: ${txnId}`
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('Error updating order:', error);
    }
  };

  const handlePay = () => {
    setStage('processing');
    
    // Simulate payment processing with progress
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setProgress(100);
        setTimeout(async () => {
          await markOrderAsPaid();
          setStage('success');
          // Auto-redirect after success
          setTimeout(() => {
            navigate(`/order-success?orderId=${orderId}`);
          }, 2000);
        }, 500);
      } else {
        setProgress(p);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#5f259f] flex flex-col">
      {/* PhonePe Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png" 
            alt="PhonePe" 
            className="h-8"
          />
          <span className="text-white/80 text-sm font-medium">Sandbox</span>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <Shield size={14} />
          <span>Secure Payment</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {stage === 'loading' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-12 h-12 text-[#5f259f] animate-spin mb-4" />
              <p className="text-gray-600">Connecting to PhonePe...</p>
            </div>
          )}

          {stage === 'confirm' && (
            <div className="flex flex-col">
              {/* Merchant Info */}
              <div className="p-6 border-b border-gray-100">
                <p className="text-gray-500 text-sm">Paying to</p>
                <p className="font-bold text-lg text-gray-900">Campus Canteen</p>
              </div>

              {/* Amount */}
              <div className="p-8 text-center bg-gradient-to-b from-gray-50 to-white">
                <p className="text-gray-500 text-sm mb-2">Amount</p>
                <p className="text-5xl font-bold text-gray-900">₹{amount || '0'}</p>
                <p className="text-xs text-gray-400 mt-2">Order #{orderId?.slice(-8)}</p>
              </div>

              {/* Payment Options */}
              <div className="p-6">
                <div className="flex items-center gap-4 p-4 bg-[#5f259f]/5 rounded-2xl border-2 border-[#5f259f] mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#5f259f] flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">PhonePe Wallet</p>
                    <p className="text-sm text-green-600">Balance: ₹10,000 (Sandbox)</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-[#5f259f] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5f259f]" />
                  </div>
                </div>

                <Button
                  onClick={handlePay}
                  className="w-full h-14 text-lg font-bold rounded-xl bg-[#5f259f] hover:bg-[#4a1d7a] text-white"
                >
                  Pay ₹{amount}
                </Button>

                <p className="text-center text-xs text-gray-400 mt-4">
                  This is a sandbox simulation. No real money will be charged.
                </p>
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-[#5f259f]/10 flex items-center justify-center mb-6">
                <Loader2 className="w-10 h-10 text-[#5f259f] animate-spin" />
              </div>
              <p className="font-semibold text-gray-900 mb-2">Processing Payment</p>
              <p className="text-gray-500 text-sm mb-6">Please wait...</p>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#5f259f]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}%</p>
            </div>
          )}

          {stage === 'success' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <p className="font-bold text-xl text-gray-900 mb-1">Payment Successful!</p>
                <p className="text-gray-500 mb-4">₹{amount} paid to Campus Canteen</p>
                <p className="text-xs text-gray-400">Transaction ID: {txnId}</p>
                <p className="text-xs text-[#5f259f] mt-4">Redirecting to order...</p>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-white/50 text-xs">PhonePe Sandbox Environment</p>
      </footer>
    </div>
  );
}
