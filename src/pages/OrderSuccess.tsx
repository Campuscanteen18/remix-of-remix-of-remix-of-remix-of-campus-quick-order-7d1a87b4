import { useEffect, useState } from 'react';
import { CheckCircle, Home, QrCode, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Logo } from '@/components/Logo';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const { currentOrder } = useCart();
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowQR(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!currentOrder) {
    navigate('/menu');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center px-4 h-16 border-b border-border bg-card">
        <Logo size="sm" />
      </header>

      <main className="flex-1 p-4 lg:p-6 max-w-lg mx-auto w-full">
        {/* Success Animation */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10 mb-4">
            <CheckCircle className="w-12 h-12 text-secondary" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground">
            Order ID: <span className="font-mono font-semibold">{currentOrder.id}</span>
          </p>
        </div>

        {/* QR Code Card */}
        <div className="bg-card rounded-3xl overflow-hidden card-shadow animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-6 text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Your Collection QR</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Show this at the canteen counter
            </p>
          </div>

          {/* QR Code */}
          <div className="p-8 flex justify-center">
            <div className={`p-4 bg-white rounded-2xl shadow-lg transition-all duration-500 ${showQR ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
              <QRCodeSVG
                value={currentOrder.qrCode}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          {/* Order Details */}
          <div className="p-6 bg-muted/30">
            <h3 className="font-bold mb-3">Order Details</h3>
            <div className="space-y-2">
              {currentOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-border font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">₹{currentOrder.total}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-6 border-t border-border">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              How to collect
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                Go to the canteen counter
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                Show this QR code to staff
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                Collect your printed receipt
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                Hand receipt to get your food
              </li>
            </ol>
          </div>

          {/* Warning */}
          <div className="mx-6 mb-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-medium text-center">
            ⚠️ This QR code can only be used once
          </div>

          <div className="p-6 pt-0">
            <Button
              className="w-full h-14 text-lg font-bold rounded-2xl gap-2"
              onClick={() => navigate('/menu')}
            >
              <Home size={20} />
              Order More
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
