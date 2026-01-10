import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Ticket, CreditCard, QrCode, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/PageTransition';
import { usePrepaidTokens, useCreatePrepaidToken, useUpdateTokenPayment } from '@/hooks/usePrepaidTokens';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

export default function PrepaidToken() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const { data: tokens = [], isLoading } = usePrepaidTokens();
  const createToken = useCreatePrepaidToken();
  const updatePayment = useUpdateTokenPayment();

  const quickAmounts = [50, 100, 200, 500];

  const handleCreateToken = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const token = await createToken.mutateAsync({ amount: amountNum });
      setPendingToken(token.id);
      setShowPayment(true);
    } catch (error) {
      toast.error('Failed to create token');
    }
  };

  const handlePaymentSuccess = async () => {
    if (!pendingToken) return;

    try {
      await updatePayment.mutateAsync({ id: pendingToken, status: 'completed' });
      toast.success('Token purchased successfully!');
      setShowPayment(false);
      setPendingToken(null);
      setAmount('');
    } catch (error) {
      toast.error('Failed to confirm payment');
    }
  };

  const handlePaymentCancel = async () => {
    if (pendingToken) {
      await updatePayment.mutateAsync({ id: pendingToken, status: 'failed' });
    }
    setShowPayment(false);
    setPendingToken(null);
  };

  const getStatusBadge = (token: { payment_status: string; is_used: boolean }) => {
    if (token.is_used) {
      return <Badge variant="secondary" className="gap-1"><Check size={12} /> Used</Badge>;
    }
    if (token.payment_status === 'completed') {
      return <Badge className="gap-1 bg-green-500"><Ticket size={12} /> Active</Badge>;
    }
    if (token.payment_status === 'pending') {
      return <Badge variant="outline" className="gap-1"><Clock size={12} /> Pending</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><X size={12} /> Failed</Badge>;
  };

  const activeTokens = tokens.filter(t => t.payment_status === 'completed' && !t.is_used);
  const usedTokens = tokens.filter(t => t.is_used);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-semibold">Prepaid Tokens</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto space-y-6">
          {/* Create Token Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ticket size={20} />
                Buy Prepaid Token
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Purchase a prepaid token with any amount. Use it at the counter to buy snacks, biscuits, and more!
              </p>

              <div className="space-y-2">
                <Label>Enter Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  max="10000"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((qa) => (
                  <Button
                    key={qa}
                    variant={amount === qa.toString() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(qa.toString())}
                  >
                    ₹{qa}
                  </Button>
                ))}
              </div>

              <Button 
                className="w-full gap-2" 
                onClick={handleCreateToken}
                disabled={createToken.isPending || !amount}
              >
                <CreditCard size={16} />
                {createToken.isPending ? 'Processing...' : 'Buy Token'}
              </Button>
            </CardContent>
          </Card>

          {/* Active Tokens */}
          {activeTokens.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Your Active Tokens</h2>
              {activeTokens.map((token) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-medium">{token.token_number}</span>
                            {getStatusBadge(token)}
                          </div>
                          <div className="text-2xl font-bold text-primary">₹{token.amount}</div>
                          <p className="text-xs text-muted-foreground">
                            Created {format(new Date(token.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="bg-white p-2 rounded-lg">
                          <QRCodeSVG value={token.qr_code} size={80} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        Show this QR code at the counter to redeem your token
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Used Tokens */}
          {usedTokens.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-muted-foreground">Used Tokens</h2>
              {usedTokens.slice(0, 5).map((token) => (
                <Card key={token.id} className="opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm">{token.token_number}</span>
                        <p className="text-xs text-muted-foreground">₹{token.amount}</p>
                      </div>
                      {getStatusBadge(token)}
                    </div>
                    {token.used_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {format(new Date(token.used_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && tokens.length === 0 && (
            <div className="text-center py-8">
              <QrCode size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No tokens yet. Buy your first token above!</p>
            </div>
          )}
        </main>

        {/* Payment Modal */}
        {showPayment && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <h2 className="text-lg font-semibold text-center">Complete Payment</h2>
              <div className="text-center text-3xl font-bold text-primary">₹{amount}</div>
              <p className="text-sm text-muted-foreground text-center">
                Pay at the counter or use UPI to complete your token purchase.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handlePaymentCancel}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handlePaymentSuccess}>
                  Confirm Payment
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
