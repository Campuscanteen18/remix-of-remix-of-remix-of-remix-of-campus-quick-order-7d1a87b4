import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt, Clock, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderTimeline } from '@/components/OrderTimeline';
import { PageTransition } from '@/components/PageTransition';
import { QRCodeSVG } from 'qrcode.react';

// Mock order data - will be replaced with real data
const mockOrder = {
  id: 'ORD-001',
  status: 'preparing' as const,
  items: [
    { name: 'Chicken Biryani', quantity: 2, price: 120 },
    { name: 'Masala Chai', quantity: 3, price: 15 },
    { name: 'Samosa', quantity: 4, price: 20 },
  ],
  subtotal: 365,
  tax: 18,
  total: 383,
  createdAt: new Date(),
  estimatedTime: '15-20 mins',
  counter: 'Counter 3',
};

export default function OrderDetails() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const order = mockOrder; // TODO: Fetch real order by ID

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'confirmed':
        return 'bg-blue-500/10 text-blue-600';
      case 'preparing':
        return 'bg-orange-500/10 text-orange-600';
      case 'ready':
        return 'bg-green-500/10 text-green-600';
      case 'collected':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-semibold">Order Details</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="p-4 max-w-lg mx-auto space-y-4">
          {/* Order Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="rounded-2xl overflow-hidden">
              <div className="bg-primary/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-bold text-lg">{order.id}</p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
              <CardContent className="p-4">
                <OrderTimeline status={order.status} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Estimated Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Time</p>
                  <p className="font-bold">{order.estimatedTime}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pickup Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pick up from</p>
                  <p className="font-bold">{order.counter}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt size={18} />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.quantity}x</span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">₹{item.price * item.quantity}</span>
                  </div>
                ))}

                <Separator className="my-3" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>₹{order.tax}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2">
                    <span>Total</span>
                    <span>₹{order.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-6 flex flex-col items-center">
                <p className="text-sm text-muted-foreground mb-4">Show this QR code at counter</p>
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG value={order.id} size={150} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Help */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button variant="outline" className="w-full rounded-xl gap-2">
              <Phone size={16} />
              Need Help? Contact Support
            </Button>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
