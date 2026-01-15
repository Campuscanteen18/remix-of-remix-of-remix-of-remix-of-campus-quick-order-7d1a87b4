import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  fallbackIcon?: boolean;
  containerClassName?: string;
}

/**
 * Image component with automatic fallback handling for broken images
 */
export function ImageWithFallback({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  fallbackIcon = false,
  className,
  containerClassName,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
    setIsLoading(false);
  }, [imgSrc, fallbackSrc]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Reset when src changes
  if (src !== imgSrc && imgSrc !== fallbackSrc) {
    setImgSrc(src);
    setHasError(false);
    setIsLoading(true);
  }

  if (hasError && fallbackIcon) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          containerClassName,
          className
        )}
        aria-label={alt}
      >
        <ImageOff className="w-1/3 h-1/3 max-w-12 max-h-12" />
      </div>
    );
  }

  return (
    <div className={cn("relative", containerClassName)}>
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-muted animate-pulse",
          className
        )} />
      )}
      <img
        src={imgSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          isLoading && "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
