import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import biteosLogo from '@/assets/biteos-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "text" | "exit">("logo");

  useEffect(() => {
    const logoTimer = setTimeout(() => setPhase("text"), 400);
    const textTimer = setTimeout(() => setPhase("exit"), 1200);
    const exitTimer = setTimeout(onComplete, 1600);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300",
        phase === "exit" ? "opacity-0" : "opacity-100",
      )}
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3" />

      <div className="relative flex flex-col items-center gap-5">
        {/* Animated Logo */}
        <img
          src={biteosLogo}
          alt="BiteOS Logo"
          className={cn(
            "w-24 h-24 object-contain transition-all duration-500 ease-out-expo",
            phase === "logo" ? "scale-0 opacity-0" : "scale-100 opacity-100",
          )}
          style={{
            filter: phase !== "logo" ? "drop-shadow(0 8px 32px hsl(var(--primary) / 0.3))" : "none",
          }}
        />

        {/* Brand Text */}
        <div
          className={cn(
            "flex items-baseline gap-0.5 transition-all duration-400 ease-out-expo",
            phase === "text" || phase === "exit" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          )}
        >
          <span className="font-display text-3xl font-semibold text-foreground tracking-tight">Bite</span>
          <span className="font-display text-3xl font-bold text-primary tracking-tight">OS</span>
        </div>

        {/* Tagline */}
        <div
          className={cn(
            "text-sm text-muted-foreground transition-all duration-400 delay-100",
            phase === "text" || phase === "exit" ? "opacity-100" : "opacity-0",
          )}
        >
          Order ahead, skip the queue
        </div>
      </div>
    </div>
  );
}
