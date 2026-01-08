import { useState, useEffect, useRef, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertCircle, Keyboard, Printer, Lock, Wifi, WifiOff } from "lucide-react";
import jsQR from "jsqr";

// Authorized UUID for scanner access
const AUTHORIZED_SCANNER_UUID = "5ebb05ff-8ce7-4631-a2ba-dfc7722aa96c";

// Audio feedback
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
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log("Audio not supported");
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
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log("Audio not supported");
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

export default function DedicatedScanner() {
  const { toast } = useToast();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const scannedOrdersRef = useRef<Set<string>>(new Set());

  // Kiosk mode setup
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const preventBack = () => window.history.pushState(null, "", window.location.href);
    const preventShortcuts = (e: KeyboardEvent) => {
      if (e.key === "F11" || (e.ctrlKey && ["w", "n", "t", "r"].includes(e.key)) || (e.altKey && e.key === "F4")) {
        e.preventDefault();
      }
    };
    const preventContext = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("popstate", preventBack);
    window.addEventListener("keydown", preventShortcuts);
    window.addEventListener("contextmenu", preventContext);
    window.addEventListener("online", () => setIsOnline(true));
    window.addEventListener("offline", () => setIsOnline(false));

    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      window.removeEventListener("popstate", preventBack);
      window.removeEventListener("keydown", preventShortcuts);
      window.removeEventListener("contextmenu", preventContext);
      clearInterval(clockInterval);
    };
  }, []);

  // Authorization check and auto-start camera
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id === AUTHORIZED_SCANNER_UUID) {
        setIsAuthorized(true);
        // Auto-start camera after authorization
        setTimeout(() => startCamera(), 500);
      }
      setAuthChecking(false);
    };
    checkAuth();

    return () => stopCamera();
  }, []);

  // Focus manual input when shown
  useEffect(() => {
    if (showManualInput && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [showManualInput]);

  // Auto-restart camera after result with countdown
  useEffect(() => {
    if (verified || alreadyUsed || error) {
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            resetAndRestartCamera();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [verified, alreadyUsed, error]);

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

  const resetAndRestartCamera = () => {
    setOrderDetails(null);
    setError(null);
    setVerified(false);
    setAlreadyUsed(false);
    setManualInput("");
    setShowManualInput(false);
    startCamera();
  };

  const handleQRDetected = useCallback(async (qrData: string) => {
    // Pause scanning while processing
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    await handleScan(qrData);
  }, []);

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
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (!stream) throw new Error("Could not access camera");

      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.muted = true;

          const playVideo = () => {
            videoRef.current
              ?.play()
              .then(() => scanQRFromCamera())
              .catch(() => setTimeout(playVideo, 500));
          };

          videoRef.current.onloadedmetadata = playVideo;
          if (videoRef.current.readyState >= 1) playVideo();
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraActive(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleScan = async (searchValue?: string) => {
    const searchTerm = searchValue || manualInput.trim();
    if (!searchTerm) return;

    setScanning(true);
    setError(null);
    setOrderDetails(null);
    setVerified(false);
    setAlreadyUsed(false);
    setShowManualInput(false);

    try {
      const cleanedTerm = searchTerm.replace("ORDER-", "").trim();

      if (scannedOrdersRef.current.has(cleanedTerm)) {
        setError("Already scanned in this session");
        playErrorSound();
        setScanning(false);
        setManualInput("");
        return;
      }

      let data = null;

      const { data: byOrderNum } = await supabase
        .from("orders")
        .select("*")
        .ilike("order_number", `%${cleanedTerm}%`)
        .limit(1)
        .maybeSingle();

      if (byOrderNum) {
        data = byOrderNum;
      } else {
        const { data: byId } = await supabase.from("orders").select("*").eq("id", cleanedTerm).maybeSingle();
        data = byId;
      }

      if (!data) {
        setError("Order not found");
        playErrorSound();
        setScanning(false);
        setManualInput("");
        return;
      }

      if (scannedOrdersRef.current.has(data.id) || scannedOrdersRef.current.has(data.order_number)) {
        setError("Already scanned in this session");
        playErrorSound();
        setScanning(false);
        setManualInput("");
        return;
      }

      const order: OrderDetails = {
        id: data.id,
        orderNumber: data.order_number,
        totalAmount: Number(data.total),
        status: data.status,
        paymentStatus: data.payment_status,
        qrUsed: data.is_used ?? false,
        createdAt: data.created_at,
        items: (data.items as unknown as OrderItem[]) || [],
      };

      setOrderDetails(order);

      if (order.qrUsed) {
        setAlreadyUsed(true);
        playErrorSound();
        scannedOrdersRef.current.add(data.id);
        scannedOrdersRef.current.add(data.order_number);
      } else {
        await verifyAndCollect(order);
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError("Failed to fetch order");
      playErrorSound();
    } finally {
      setScanning(false);
      setManualInput("");
    }
  };

  const verifyAndCollect = async (order: OrderDetails) => {
    if (order.qrUsed) {
      setAlreadyUsed(true);
      playErrorSound();
      return;
    }

    try {
      const { error } = await supabase.from("orders").update({ is_used: true, status: "completed" }).eq("id", order.id);

      if (error) throw error;

      scannedOrdersRef.current.add(order.id);
      scannedOrdersRef.current.add(order.orderNumber);

      setOrderDetails({ ...order, qrUsed: true, status: "completed" });
      setVerified(true);
      playSuccessSound();

      // Auto print receipt
      setTimeout(() => printReceipt({ ...order, qrUsed: true, status: "completed" }), 300);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to verify order.",
        variant: "destructive",
      });
    }
  };

  const printReceipt = (order: OrderDetails) => {
    const itemsHTML = order.items
      .map(
        (item) => `
      <div style="display:flex;justify-content:space-between;margin:4px 0;">
        <span>${item.name} x${item.quantity}</span>
        <span>₹${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `,
      )
      .join("");

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 5mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:18px;">🍽️ CAMPUS CANTEEN</div>
        <div class="divider"></div>
        <div class="center bold" style="font-size:16px;">${order.orderNumber}</div>
        <div class="center" style="font-size:10px;">${new Date(order.createdAt).toLocaleString()}</div>
        <div style="border:2px solid #000;padding:8px;margin:10px 0;text-align:center;font-size:16px;font-weight:bold;">✓ VERIFIED</div>
        <div class="divider"></div>
        <div class="bold">ITEMS:</div>
        ${itemsHTML}
        <div style="border-top:2px solid #000;margin:8px 0;"></div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;">
          <span>TOTAL</span>
          <span>₹${order.totalAmount.toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size:10px;">
          <p>Verified: ${new Date().toLocaleTimeString()}</p>
          <p>Thank you!</p>
        </div>
        <script>window.onload = () => { window.print(); setTimeout(() => window.parent.document.body.removeChild(window.frameElement), 1000); };</script>
      </body>
      </html>
    `;

    const printFrame = document.createElement("iframe");
    printFrame.style.cssText = "position:absolute;top:-10000px;left:-10000px;";
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(receiptHTML);
      frameDoc.close();
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-lg">Initializing...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You are not authorized to access this scanner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden">
      {/* Video Background */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-white/80 text-sm font-medium">SCANNER ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span className="text-white/60 text-sm">{isOnline ? "Online" : "Offline"}</span>
            </div>
            <span className="text-white/80 text-sm font-mono">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Scanning Frame - Only show when no result */}
      {!orderDetails && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="relative">
            {/* Scanning box */}
            <div className="w-72 h-72 md:w-80 md:h-80 relative">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-emerald-500 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-emerald-500 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-emerald-500 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-emerald-500 rounded-br-2xl" />

              {/* Scanning line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse"
                style={{
                  top: "50%",
                  boxShadow: "0 0 20px rgba(16, 185, 129, 0.6), 0 0 40px rgba(16, 185, 129, 0.3)",
                }}
              />
            </div>

            {/* Instruction text */}
            <p className="text-center text-white/70 text-sm mt-6">
              {scanning ? "Processing..." : "Position QR code within frame"}
            </p>
          </div>
        </div>
      )}

      {/* Result Overlays */}
      {(orderDetails || error) && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-sm">
          {/* Success */}
          {verified && orderDetails && (
            <div className="text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(16,185,129,0.5)]">
                <CheckCircle className="w-20 h-20 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">Verified</h2>
              <p className="text-2xl text-emerald-400 font-mono mb-4">{orderDetails.orderNumber}</p>
              <div className="flex items-center justify-center gap-2 text-white/60 mb-6">
                <Printer className="w-5 h-5" />
                <span>Receipt sent to printer</span>
              </div>
              <div className="text-white/40 text-sm">Next scan in {countdown}s</div>
            </div>
          )}

          {/* Already Used */}
          {alreadyUsed && orderDetails && (
            <div className="text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-32 h-32 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(245,158,11,0.5)]">
                <AlertCircle className="w-20 h-20 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">Already Used</h2>
              <p className="text-2xl text-amber-400 font-mono mb-4">{orderDetails.orderNumber}</p>
              <p className="text-white/60 mb-6">This order has been collected</p>
              <div className="text-white/40 text-sm">Next scan in {countdown}s</div>
            </div>
          )}

          {/* Error */}
          {error && !orderDetails && (
            <div className="text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(239,68,68,0.5)]">
                <XCircle className="w-20 h-20 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">Not Found</h2>
              <p className="text-white/60 mb-6">{error}</p>
              <div className="text-white/40 text-sm">Next scan in {countdown}s</div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="px-6 py-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Manual Entry Toggle */}
          {showManualInput ? (
            <div className="max-w-md mx-auto">
              <div className="flex gap-3">
                <Input
                  ref={manualInputRef}
                  placeholder="Enter order number..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  className="flex-1 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl text-lg backdrop-blur-sm"
                  autoFocus
                />
                <Button
                  onClick={() => handleScan()}
                  disabled={scanning || !manualInput.trim()}
                  className="h-14 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {scanning ? "Verifying..." : "Verify"}
                </Button>
              </div>
              <button
                onClick={() => setShowManualInput(false)}
                className="w-full mt-3 text-white/50 text-sm hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setShowManualInput(true)}
                className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all text-white/80 hover:text-white"
              >
                <Keyboard className="w-5 h-5" />
                <span className="text-sm font-medium">Enter Code Manually</span>
              </button>
            </div>
          )}

          {/* Branding */}
          <div className="flex justify-center mt-6 opacity-60">
            <Logo size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
