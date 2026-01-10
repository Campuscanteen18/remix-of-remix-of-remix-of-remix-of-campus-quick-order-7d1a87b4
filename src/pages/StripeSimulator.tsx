import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, CreditCard, Lock, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export default function StripeSimulator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const txnId = searchParams.get('txnId');
  
  const [stage, setStage] = useState<'loading' | 'card' | 'processing' | 'success' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardError, setCardError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setStage('card'), 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const markOrderAsPaid = async () => {
    if (!orderId) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        payment_status: 'paid',
        status: 'confirmed',
        payment_method: 'STRIPE_SANDBOX',
        notes: `Sandbox TXN: ${txnId}`
      })
      .eq('id', orderId);
    
    if (error) {
      console.error('Error updating order:', error);
    }
  };

  const handlePay = () => {
    // Basic validation
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setCardError('Please enter a valid card number');
      return;
    }
    if (expiry.length < 5) {
      setCardError('Please enter a valid expiry date');
      return;
    }
    if (cvc.length < 3) {
      setCardError('Please enter a valid CVC');
      return;
    }

    setCardError('');
    setStage('processing');
    
    // Simulate payment processing with progress
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20 + 10;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setProgress(100);
        setTimeout(async () => {
          // Simulate 90% success rate
          if (Math.random() > 0.1) {
            await markOrderAsPaid();
            setStage('success');
            setTimeout(() => {
              navigate(`/order-success?orderId=${orderId}`);
            }, 2000);
          } else {
            setStage('error');
          }
        }, 500);
      } else {
        setProgress(p);
      }
    }, 200);
  };

  const handleCancel = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Stripe Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#635bff] flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-white font-semibold text-lg">Stripe</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            TEST MODE
          </span>
        </div>
        <button 
          onClick={handleCancel}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X size={16} className="text-white/70" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {stage === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 text-[#635bff] animate-spin mx-auto mb-4" />
              <p className="text-white/70">Initializing secure checkout...</p>
            </motion.div>
          )}

          {stage === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Amount Header */}
                <div className="bg-gradient-to-r from-[#635bff] to-[#8b5cf6] p-6 text-white">
                  <p className="text-sm opacity-80">Pay Campus Canteen</p>
                  <p className="text-4xl font-bold mt-1">₹{amount || '0'}</p>
                  <p className="text-xs opacity-60 mt-2">Order #{orderId?.slice(-8)}</p>
                </div>

                {/* Card Form */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Card number
                    </label>
                    <div className="relative">
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 1234 1234 1234"
                        maxLength={19}
                        className="h-12 pl-12 text-lg font-mono"
                      />
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Expiry
                      </label>
                      <Input
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="h-12 text-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        CVC
                      </label>
                      <Input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        className="h-12 text-lg font-mono"
                      />
                    </div>
                  </div>

                  {cardError && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      {cardError}
                    </p>
                  )}

                  <div className="pt-2">
                    <Button
                      onClick={handlePay}
                      className="w-full h-14 text-lg font-semibold rounded-xl bg-[#635bff] hover:bg-[#5851ea] text-white"
                    >
                      Pay ₹{amount}
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                    <Lock size={12} />
                    <span>Secured by Stripe (Sandbox)</span>
                  </div>

                  {/* Test Card Info */}
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Test Card Numbers:</p>
                    <p className="text-xs text-amber-700 font-mono">4242 4242 4242 4242</p>
                    <p className="text-xs text-amber-600 mt-1">Any future expiry, any 3-digit CVC</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#635bff]/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-[#635bff] animate-spin" />
              </div>
              <p className="font-semibold text-gray-900 mb-2">Processing Payment</p>
              <p className="text-gray-500 text-sm mb-6">Please don't close this window...</p>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#635bff]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}%</p>
            </motion.div>
          )}

          {stage === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white rounded-2xl p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="font-bold text-xl text-gray-900 mb-1">Payment Successful!</p>
                <p className="text-gray-500 mb-4">₹{amount} paid to Campus Canteen</p>
                <p className="text-xs text-gray-400">Transaction ID: {txnId}</p>
                <p className="text-xs text-[#635bff] mt-4 animate-pulse">Redirecting to your order...</p>
              </motion.div>
            </motion.div>
          )}

          {stage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white rounded-2xl p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <X className="w-12 h-12 text-red-600" />
              </div>
              <p className="font-bold text-xl text-gray-900 mb-1">Payment Failed</p>
              <p className="text-gray-500 mb-6">Your card was declined. Please try again.</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setProgress(0);
                    setStage('card');
                  }}
                  className="flex-1 h-12 bg-[#635bff] hover:bg-[#5851ea]"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center border-t border-white/10">
        <p className="text-white/40 text-xs">Stripe Sandbox Environment • No real charges</p>
      </footer>
    </div>
  );
}
