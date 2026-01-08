import { cn } from '@/lib/utils';
import { UtensilsCrossed } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
};

const textSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div 
        className={cn(
          'relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg',
          sizeClasses[size]
        )}
      >
        <UtensilsCrossed size={iconSizes[size]} strokeWidth={2.5} />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-background" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-bold leading-tight text-foreground', textSizes[size])}>
            Campus
          </span>
          <span className={cn('font-bold leading-tight text-primary -mt-1', textSizes[size])}>
            Canteen
          </span>
        </div>
      )}
    </div>
  );
}
