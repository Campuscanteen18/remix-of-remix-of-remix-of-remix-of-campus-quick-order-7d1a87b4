import { useEffect, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo');

  useEffect(() => {
    const logoTimer = setTimeout(() => setPhase('text'), 600);
    const textTimer = setTimeout(() => setPhase('exit'), 1400);
    const exitTimer = setTimeout(onComplete, 1800);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-400',
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo */}
        <div
          className={cn(
            'relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl transition-all duration-500',
            phase === 'logo' ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
          )}
        >
          <UtensilsCrossed size={48} strokeWidth={2.5} />
          <div 
            className={cn(
              'absolute -top-2 -right-2 w-5 h-5 bg-secondary rounded-full border-4 border-background transition-all duration-300 delay-200',
              phase === 'logo' ? 'scale-0' : 'scale-100'
            )} 
          />
        </div>

        {/* Brand Text */}
        <div
          className={cn(
            'flex flex-col items-center transition-all duration-500',
            phase === 'text' || phase === 'exit' 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          )}
        >
          <span className="text-3xl font-bold text-foreground leading-tight">
            Campus
          </span>
          <span className="text-3xl font-bold text-primary leading-tight -mt-1">
            Canteen
          </span>
        </div>
      </div>
    </div>
  );
}
