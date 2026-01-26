import { cn } from '@/lib/utils';
import biteosLogo from '@/assets/biteos-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
};

const textSizes = {
  sm: 'text-[15px]',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img 
        src={biteosLogo} 
        alt="BiteOS Logo" 
        className={cn('object-contain', sizeClasses[size])}
      />
      {showText && (
        <div className="flex items-baseline leading-none">
          <span className={cn('font-display font-semibold text-foreground tracking-tight', textSizes[size])}>
            Bite
          </span>
          <span className={cn('font-display font-bold text-primary tracking-tight', textSizes[size])}>
            OS
          </span>
        </div>
      )}
    </div>
  );
}
