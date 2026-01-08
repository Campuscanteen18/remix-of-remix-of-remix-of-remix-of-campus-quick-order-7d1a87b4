import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOrdersContext } from '@/context/OrdersContext';
import { useAuth } from '@/context/AuthContext';
import { usePrinter } from '@/context/PrinterContext';
import { LogOut, CheckCircle, XCircle, AlertCircle, RefreshCw, Bluetooth, Volume2, VolumeX, Loader2, Printer } from 'lucide-react';
import jsQR from 'jsqr';

// Audio feedback using Web Audio API
const playSuccessSound = () => {
  try {
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
  } catch (e) {
    console.log('Audio not supported');
  }
};

const playErrorSound = () => {
  try {
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
  } catch (e) {
    console.log('Audio not supported');
  }
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

export default function KioskScanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orders, markOrderCollected, getOrderByQR } = useOrdersContext();
  const { logout } = useAuth();
  const { isPrinterConnected, isConnecting, isPrinting, connectPrinter, printTicket } = usePrinter();
  
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [verified, setVerified] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const scannedOrdersRef = useRef<Set<string>>(new Set());
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartCameraRef = useRef<() => void>(() => {});

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleScan = useCallback(async (qrData: string) => {
    if (scanning) return;

    setScanning(true);

    try {
      const cleanedTerm = qrData.replace('ORDER-', '').trim();

      // Check if already scanned in session
      if (scannedOrdersRef.current.has(cleanedTerm)) {
        setAlreadyUsed(true);
        setVerified(false);
        setShowResult(true);
        if (soundEnabled) playErrorSound();
        return;
      }

      const foundOrder = getOrderByQR(cleanedTerm);

      if (!foundOrder) {
        // We already stopped the camera in handleQRDetected(); show the result screen so
        // the existing auto-resume logic reliably restarts the camera.
        setOrderDetails(null);
        setVerified(false);
        setAlreadyUsed(false);
        setShowResult(true);
        if (soundEnabled) playErrorSound();
        return;
      }

      if (scannedOrdersRef.current.has(foundOrder.id) || scannedOrdersRef.current.has(foundOrder.qrCode)) {
        setAlreadyUsed(true);
        setVerified(false);
        setShowResult(true);
        if (soundEnabled) playErrorSound();
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

      if (order.qrUsed) {
        setAlreadyUsed(true);
        setVerified(false);
        scannedOrdersRef.current.add(foundOrder.id);
        scannedOrdersRef.current.add(foundOrder.qrCode);
        if (soundEnabled) playErrorSound();
        setShowResult(true);
      } else {
        // Mark as collected
        markOrderCollected(foundOrder.id);
        scannedOrdersRef.current.add(foundOrder.id);
        scannedOrdersRef.current.add(foundOrder.qrCode);
        setVerified(true);
        setAlreadyUsed(false);
        if (soundEnabled) playSuccessSound();

        // Print directly to Bluetooth printer - skip result screen for valid orders
        if (isPrinterConnected) {
          setPrintingOrder(true);
          toast({
            title: '✓ Order Verified',
            description: `Order #${order.orderNumber} - Printing ticket...`,
          });
          
          // Print to Bluetooth thermal printer
          const printData = {
            orderNumber: order.orderNumber,
            items: order.items,
            totalAmount: order.totalAmount,
            customerName: 'Customer',
            createdAt: order.createdAt,
          };
          
          printTicket(printData).then((success) => {
            setPrintingOrder(false);
            if (success) {
              toast({
                title: '🖨️ Printed!',
                description: `Order #${order.orderNumber} ticket printed successfully`,
              });
            }
            // Restart camera for next scan
            setTimeout(() => restartCameraRef.current(), 1500);
          });
          return; // Don't show result screen
        } else {
          // No printer connected - show result screen
          setShowResult(true);
          toast({
            title: '⚠️ No Printer',
            description: 'Connect Bluetooth printer for auto-printing',
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      setCameraError('Scan failed');
      if (soundEnabled) playErrorSound();
    } finally {
      // IMPORTANT: always unlock scanning, otherwise subsequent scans will be ignored and the camera may stay stopped.
      setScanning(false);
    }
  }, [scanning, getOrderByQR, markOrderCollected, soundEnabled, isPrinterConnected, printTicket, toast]);

  const handleQRDetected = useCallback(async (qrData: string) => {
    stopCamera();
    await handleScan(qrData);
  }, [stopCamera, handleScan]);

  const scanQRFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
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
        inversionAttempts: 'dontInvert',
      });
      
      if (code && code.data) {
        handleQRDetected(code.data);
        return;
      }
      
      animationRef.current = requestAnimationFrame(scan);
    };
    
    animationRef.current = requestAnimationFrame(scan);
  }, [handleQRDetected]);

  const startCamera = useCallback(async () => {
    // Always stop any previous loop/stream first (important for repeated restarts)
    stopCamera();

    setCameraError(null);
    setOrderDetails(null);
    setVerified(false);
    setAlreadyUsed(false);
    setShowResult(false);
    setScanning(false);

    // Clear any result timeout
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setCameraActive(true);

      // Wait one frame so the <video> is mounted (it only renders when cameraActive && !showResult)
      requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;

        // Wait until the video has metadata (so play() reliably works on repeated restarts)
        const ensureMetadata = () =>
          new Promise<void>((resolve) => {
            if (video.readyState >= 1) return resolve();
            video.onloadedmetadata = function (this: HTMLVideoElement) {
              // remove handler to avoid stacking
              this.onloadedmetadata = null;
              resolve();
            };
          });

        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.srcObject = streamRef.current;

        try {
          await ensureMetadata();
          await video.play();
          scanQRFromCamera();
        } catch (err) {
          console.error('Video play error:', err);
          setCameraError('Failed to start camera');
          setCameraActive(false);
        }
      });
    } catch (err) {
      console.error('Camera error:', err);
      setCameraActive(false);
      setCameraError('Camera access denied. Please allow camera permissions.');
    }
  }, [scanQRFromCamera, stopCamera]);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    
    // Request fullscreen
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        // Fullscreen not supported or denied - that's okay
      }
    };
    requestFullscreen();
    
    return () => {
      stopCamera();
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, []);

  const resetAndRestartCamera = useCallback(() => {
    console.log('Resetting and restarting camera...');
    // Clear any pending timeout
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
    
    // Reset all states first
    setShowResult(false);
    setCameraError(null);
    setOrderDetails(null);
    setVerified(false);
    setAlreadyUsed(false);
    setScanning(false);
    setPrintingOrder(false);
    
    // Start camera fresh
    startCamera();
  }, [startCamera]);

  // Keep the ref updated so handleScan can access the latest restart function
  useEffect(() => {
    restartCameraRef.current = resetAndRestartCamera;
  }, [resetAndRestartCamera]);

  // Auto resume after showing result
  useEffect(() => {
    if (showResult) {
      console.log('showResult is true, scheduling auto-resume in 4 seconds');
      resultTimeoutRef.current = setTimeout(() => {
        console.log('Auto-resume timeout triggered');
        resetAndRestartCamera();
      }, 4000);
    }
    
    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, [showResult, resetAndRestartCamera]);

  const handleLogout = async () => {
    stopCamera();
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    await logout();
    navigate('/auth');
  };

  const printToThermalPrinter = (order: OrderDetails) => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    document.body.appendChild(printFrame);
    
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const itemsHTML = order.items.map(item => `
      <div class="item-row">
        <span>${item.name} x${item.quantity}</span>
        <span>₹${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

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

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isPrinterConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          <span className="text-white font-medium text-sm">
            {isPrinterConnected ? 'PRINTER READY' : 'NO PRINTER'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={connectPrinter}
            disabled={isConnecting || isPrinterConnected}
            className="text-white hover:bg-white/20 gap-1"
          >
            {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Bluetooth size={18} />}
            {isPrinterConnected ? 'Connected' : 'Connect'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-white hover:bg-white/20"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </div>

      {/* Printing Overlay */}
      {printingOrder && (
        <div className="absolute inset-0 z-40 bg-green-600 flex flex-col items-center justify-center">
          <CheckCircle className="w-24 h-24 text-white mb-4" />
          <h2 className="text-white text-3xl font-bold mb-2">VERIFIED!</h2>
          <div className="flex items-center gap-2 text-white/90">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-xl">Printing ticket...</span>
          </div>
        </div>
      )}

      {/* Camera View - Full Screen (keep showing during error overlays) */}
      {cameraActive && (!showResult || !verified) && (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            webkit-playsinline="true"
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-72">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
              
              {/* Scanning line animation */}
              {!showResult && <div className="absolute inset-x-4 h-0.5 bg-primary/80 animate-scan" />}
            </div>
          </div>
          
          {/* Bottom instruction - hide when showing error result */}
          {!showResult && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-full text-lg font-medium">
                Point camera at QR code
              </div>
            </div>
          )}

          {/* Small Error Overlay on Camera - for ALREADY USED / INVALID */}
          {showResult && !verified && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-destructive/95 backdrop-blur-sm rounded-2xl px-8 py-6 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200">
                <XCircle className="w-12 h-12 text-white mb-3" />
                <h2 className="text-white text-xl font-bold">
                  {alreadyUsed ? 'ALREADY USED' : 'INVALID'}
                </h2>
                <p className="text-white/80 text-sm mt-1 text-center max-w-[200px]">
                  {alreadyUsed 
                    ? 'QR already scanned' 
                    : 'Order not found'}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Camera Error State */}
      {cameraError && !showResult && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <AlertCircle className="w-20 h-20 text-destructive mb-6" />
          <h2 className="text-white text-2xl font-bold mb-2">Camera Error</h2>
          <p className="text-white/70 text-center mb-8">{cameraError}</p>
          <Button onClick={startCamera} size="lg" className="gap-2">
            <RefreshCw size={20} />
            Retry Camera
          </Button>
        </div>
      )}

      {/* Full Screen Verified Result (only for verified orders without printer) */}
      {showResult && verified && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-green-600">
          <CheckCircle className="w-32 h-32 text-white mb-6 animate-bounce" />
          <h1 className="text-white text-4xl font-bold mb-4">VERIFIED!</h1>
          {orderDetails && (
            <div className="text-white/90 text-center">
              <p className="text-2xl font-semibold mb-2">Order #{orderDetails.orderNumber}</p>
              <p className="text-xl">₹{orderDetails.totalAmount}</p>
              <div className="mt-4 space-y-1">
                {orderDetails.items.map((item, idx) => (
                  <p key={idx} className="text-lg">{item.name} × {item.quantity}</p>
                ))}
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              if (orderDetails && isPrinterConnected) {
                printTicket({
                  orderNumber: orderDetails.orderNumber,
                  items: orderDetails.items,
                  totalAmount: orderDetails.totalAmount,
                  customerName: 'Customer',
                  createdAt: orderDetails.createdAt,
                });
              } else if (!isPrinterConnected) {
                toast({
                  title: 'No Printer',
                  description: 'Connect Bluetooth printer first',
                  variant: 'destructive',
                });
              }
            }}
            disabled={isPrinting || !isPrinterConnected}
            className="mt-8 gap-2"
          >
            {isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </Button>
          
          {/* Scan Next button */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={resetAndRestartCamera}
              className="gap-2 bg-white text-black hover:bg-white/90"
            >
              <RefreshCw size={20} />
              Scan Next
            </Button>
            <div className="text-white/60 text-sm">
              or wait for auto-resume...
            </div>
          </div>
        </div>
      )}

      {/* Add scanning animation styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 1rem; }
          50% { top: calc(100% - 1rem); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
