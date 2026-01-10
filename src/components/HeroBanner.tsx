import { Clock, Utensils } from 'lucide-react';
import heroBannerImg from '@/assets/hero-banner.jpg';

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-5">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroBannerImg} 
          alt="Fresh campus food" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/70 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-5 md:p-6 text-background">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Open Now</span>
          </div>
        </div>
        <h2 className="font-display text-xl md:text-2xl font-bold mb-1.5 tracking-tight">
          Fresh, Fast & Delicious
        </h2>
        <p className="text-sm text-background/85 max-w-xs leading-relaxed flex items-center gap-1.5">
          <Utensils size={14} className="opacity-70" />
          Made with love, served with a smile
        </p>
      </div>
    </div>
  );
}
