import { Sparkles } from 'lucide-react';
import heroBannerImg from '@/assets/hero-banner.jpg';

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-4 lg:mb-6">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroBannerImg} 
          alt="Delicious food" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-4 md:p-6 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-yellow-300" />
          <span className="text-xs font-medium opacity-90">Quick & Easy</span>
        </div>
        <h2 className="text-lg md:text-2xl font-bold mb-0.5">
          Pre-order & Skip the Queue!
        </h2>
        <p className="text-xs opacity-90 max-w-md">
          Order now, pay online & collect with QR code
        </p>
      </div>
    </div>
  );
}
