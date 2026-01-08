import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useOrdersContext } from "@/context/OrdersContext";
import {
  LogOut,
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  ScanLine,
  RefreshCw,
  Camera,
  Printer,
  StopCircle,
} from "lucide-react";
import jsQR from "jsqr";

// Audio feedback using Web Audio API
const playSuccessSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
};

const playErrorSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.15);
  oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.3);

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  qrUsed: boolean;
  createdAt: string;
  items: OrderItem[];
}

export default function QRScanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orders, markOrderCollected, getOrderByQR } = useOrdersContext();

  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Track scanned order IDs to prevent duplicate scans in session
  const scannedOrdersRef = useRef<Set<string>>(new Set());

  // Get recent orders from context
  const recentOrders: OrderDetails[] = orders.slice(0, 5).map((order) => ({
    id: order.id,
    orderNumber: order.qrCode,
    totalAmount: order.total,
    status: order.status,
    paymentStatus: order.paymentMethod || 'cash',
    qrUsed: order.isUsed,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  }));

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleQRDetected = useCallback(
    async (qrData: string) => {
      stopCamera();
      await handleScan(qrData);
    },
    [stopCamera],
  );

  const scanQRFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const scan = () => {
      if (!ctx || !streamRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        handleQRDetected(code.data);
        return;
      }

      animationRef.current = requestAnimationFrame(scan);
    };

    animationRef.current = requestAnimationFrame(scan);
  }, [handleQRDetected]);

  const startCamera = async () => {
    setError(null);
    setOrderDetails(null);
    setVerified(false);
    setAlreadyUsed(false);

    try {
      // First stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      setCameraActive(true);

      // Wait for next frame to ensure video element is rendered
      requestAnimationFrame(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.muted = true;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .then(() => {
                console.log("Video playing, starting QR scan");
                scanQRFromCamera();
              })
              .catch((err) => {
                console.error("Video play error:", err);
              });
          };
        }
      });
    } catch (err) {
      console.error("Camera error:", err);
      setCameraActive(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const handleScan = async (searchValue?: string) => {
    const searchTerm = searchValue || qrInput.trim();
    if (!searchTerm) return;

    setScanning(true);
    setError(null);
    setOrderDetails(null);
    setVerified(false);
    setAlreadyUsed(false);

    try {
      const cleanedTerm = searchTerm.replace("ORDER-", "").trim();

      // Check if this order was already scanned in this session
      if (scannedOrdersRef.current.has(cleanedTerm)) {
        setError("Already scanned in this session");
        playErrorSound();
        stopCamera();
        setScanning(false);
        setQrInput("");
        return;
      }

      const foundOrder = getOrderByQR(cleanedTerm);

      if (!foundOrder) {
        setError("Order not found. Please check the order number or scan a valid QR code.");
        stopCamera();
        setScanning(false);
        setQrInput("");
        return;
      }

      // Check if already scanned by order ID
      if (scannedOrdersRef.current.has(foundOrder.id) || scannedOrdersRef.current.has(foundOrder.qrCode)) {
        setError("Already scanned in this session");
        playErrorSound();
        stopCamera();
        setScanning(false);
        setQrInput("");
        return;
      }

      const order: OrderDetails = {
        id: foundOrder.id,
        orderNumber: foundOrder.qrCode,
        totalAmount: foundOrder.total,
        status: foundOrder.status,
        paymentStatus: foundOrder.paymentMethod || 'cash',
        qrUsed: foundOrder.isUsed,
        createdAt: foundOrder.createdAt.toISOString(),
        items: foundOrder.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      setOrderDetails(order);
      stopCamera();

      // Check if already used - show expired
      if (order.qrUsed) {
        setAlreadyUsed(true);
        playErrorSound();
        scannedOrdersRef.current.add(foundOrder.id);
        scannedOrdersRef.current.add(foundOrder.qrCode);
        toast({
          title: "Order Expired/Used",
          description: "This QR code has already been scanned and used.",
          variant: "destructive",
        });
      } else {
        // Auto verify and print
        await autoVerifyAndPrint(order, foundOrder.id);
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError("Failed to fetch order. Please try again.");
    } finally {
      setScanning(false);
      setQrInput("");
    }
  };

  const autoVerifyAndPrint = async (order: OrderDetails, orderId: string) => {
    try {
      markOrderCollected(orderId);

      // Add to scanned set to prevent duplicate scans
      scannedOrdersRef.current.add(order.id);
      scannedOrdersRef.current.add(order.orderNumber);

      setOrderDetails({ ...order, qrUsed: true, status: "collected" });
      setVerified(true);
      playSuccessSound();
      toast({
        title: "✓ Verified!",
        description: `Order ${order.orderNumber} verified and collected.`,
      });

      // Auto print to thermal printer
      setTimeout(() => printToThermalPrinter({ ...order, qrUsed: true, status: "collected" }), 300);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark order as collected.",
        variant: "destructive",
      });
    }
  };

  // Direct thermal/mini printer printing
  const printToThermalPrinter = (order: OrderDetails) => {
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-10000px";
    printFrame.style.left = "-10000px";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const itemsHTML = order.items
      .map(
        (item) => `
      <div class="item-row">
        <span>${item.name} x${item.quantity}</span>
        <span>₹${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `,
      )
      .join("");

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.4;
            width: 80mm;
            padding: 5mm;
            background: white;
            color: black;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .xlarge { font-size: 20px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin: 8px 0; }
          .verified-badge { border: 2px solid #000; padding: 8px; margin: 10px 0; text-align: center; font-size: 18px; font-weight: bold; }
          .footer { margin-top: 15px; text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="center bold xlarge">🍽️ CANTEEN</div>
        <div class="center" style="margin-top: 5px;">Order Verification Receipt</div>
        <div class="divider"></div>
        
        <div class="center large bold">${order.orderNumber}</div>
        <div class="center" style="font-size: 10px; margin-top: 3px;">
          ${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}
        </div>
        
        <div class="verified-badge">✓ VERIFIED</div>
        
        <div class="divider"></div>
        <div style="font-weight: bold; margin-bottom: 5px;">ITEMS:</div>
        ${itemsHTML}
        
        <div class="double-divider"></div>
        <div class="total-row">
          <span>TOTAL</span>
          <span>₹${order.totalAmount.toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        
        <div class="footer">
          <p>Verified: ${new Date().toLocaleTimeString()}</p>
          <p style="margin-top: 5px;">Thank you for your order!</p>
          <p style="margin-top: 10px;">--- END ---</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.parent.document.body.removeChild(window.frameElement);
            }, 1000);
          };
        </script>
      </body>
      </html>
    `);
    frameDoc.close();
  };

  const getStatusBadge = (status: string, qrUsed: boolean) => {
    if (qrUsed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
          <CheckCircle size={14} />
          Collected
        </span>
      );
    }
    switch (status) {
      case "confirmed":
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
            <CheckCircle size={14} />
            Ready
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
            <AlertCircle size={14} />
            Pending
          </span>
        );
      default:
        return <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1">
              <ArrowLeft size={16} />
              Dashboard
            </Button>
            <Logo size="sm" showText={false} />
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">QR Scanner</h1>
            <p className="text-sm text-muted-foreground">Verify and collect orders</p>
          </div>
        </div>

        {/* Camera View */}
        {cameraActive && (
          <Card className="rounded-2xl overflow-hidden mb-6">
            <div className="relative bg-black" style={{ minHeight: "300px" }}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                webkit-playsinline="true"
                muted
                autoPlay
                style={{ transform: "scaleX(1)" }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-48 h-48 border-2 border-primary rounded-xl animate-pulse" />
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium z-10">
                Scanning for QR code...
              </div>
              <Button
                variant="destructive"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 gap-2 z-10"
                onClick={stopCamera}
              >
                <StopCircle size={18} />
                Stop Camera
              </Button>
            </div>
          </Card>
        )}

        {/* Scanner Input */}
        <Card className="rounded-2xl card-shadow mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Scan or Enter Order Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cameraActive && (
              <Button variant="outline" onClick={startCamera} className="w-full h-12 rounded-xl gap-2">
                <Camera size={18} />
                Open Camera
              </Button>
            )}
            <div className="flex gap-3">
              <Input
                placeholder="Enter order number (e.g., ORD-ABC123)"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="flex-1 h-12 rounded-xl"
              />
              <Button onClick={() => handleScan()} disabled={scanning} className="h-12 px-6 rounded-xl gap-2">
                <Search size={18} />
                {scanning ? "Scanning..." : "Scan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="rounded-2xl border-destructive/50 bg-destructive/5 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-destructive">
                <XCircle size={20} />
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {orderDetails && (
          <Card
            className={`rounded-2xl card-shadow animate-slide-up mb-6 ${
              verified ? "border-2 border-secondary" : alreadyUsed ? "border-2 border-destructive" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Order #{orderDetails.orderNumber}</CardTitle>
              {alreadyUsed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-bold">
                  <AlertCircle size={14} />
                  EXPIRED / USED
                </span>
              ) : verified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-bold">
                  <CheckCircle size={14} />
                  VERIFIED
                </span>
              ) : (
                getStatusBadge(orderDetails.status, orderDetails.qrUsed)
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Info */}
              <div className="p-4 rounded-2xl bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Ordered: {new Date(orderDetails.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Payment: <span className="capitalize">{orderDetails.paymentStatus}</span>
                </p>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="space-y-2">
                  {orderDetails.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                      <span className="text-muted-foreground">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-primary/5">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">₹{orderDetails.totalAmount}</span>
              </div>

              {/* Status Display */}
              {verified ? (
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl gap-2"
                  onClick={() => printToThermalPrinter(orderDetails)}
                >
                  <Printer size={18} />
                  Print Receipt Again
                </Button>
              ) : alreadyUsed ? (
                <div className="p-6 rounded-2xl bg-destructive/10 text-center">
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h3 className="font-semibold text-destructive">Order Already Used</h3>
                  <p className="text-sm text-muted-foreground">This QR code has been scanned before.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Recent Orders for Testing */}
        <Card className="rounded-2xl card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders (Test)</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setQrInput(order.orderNumber);
                      handleScan(order.orderNumber);
                    }}
                    className="w-full p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{order.totalAmount} • {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {getStatusBadge(order.status, order.qrUsed)}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
