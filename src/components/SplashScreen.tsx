import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div
          className={cn(
            "relative flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground transition-all duration-500 ease-out-expo",
            phase === "logo" ? "scale-0 opacity-0" : "scale-100 opacity-100",
          )}
          style={{
            boxShadow: phase !== "logo" ? "0 8px 32px -8px hsl(var(--primary) / 0.4)" : "none",
          }}
        >
          <Utensils size={40} strokeWidth={1.8} />
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-lg border-3 border-background transition-all duration-300 delay-150",
              phase === "logo" ? "scale-0" : "scale-100",
            )}
          />
        </div>

        {/* Brand Text */}
        <div
          className={cn(
            "flex flex-col items-center gap-0.5 transition-all duration-400 ease-out-expo",
            phase === "text" || phase === "exit" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          )}
        >
          <span className="font-display text-2xl font-semibold text-foreground tracking-tight">Bite</span>
          <span className="font-display text-2xl font-bold text-primary tracking-tight">OS</span>
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
