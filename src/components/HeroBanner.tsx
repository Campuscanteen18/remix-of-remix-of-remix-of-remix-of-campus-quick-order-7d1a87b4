import { Sparkles } from 'lucide-react';
import heroBannerImg from '@/assets/hero-banner.jpg';

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-5">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroBannerImg} 
          alt="Fresh food" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/60 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-5 md:p-6 text-background">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-canteen-warning/90 text-canteen-dark">
            <Sparkles size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Quick Order</span>
          </div>
        </div>
      </div>
    </div>
  );
}
