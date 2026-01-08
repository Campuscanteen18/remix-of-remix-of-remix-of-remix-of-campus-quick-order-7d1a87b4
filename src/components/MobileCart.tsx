import { ShoppingBag, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';

export function MobileCart() {
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 lg:hidden z-50">
      <button
        onClick={() => navigate('/checkout')}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary text-secondary-foreground shadow-xl active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-foreground/10 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div className="text-left">
            <span className="font-bold">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            <p className="text-xs opacity-80">Tap to checkout</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">₹{totalPrice}</span>
          <ChevronUp size={20} />
        </div>
      </button>
    </div>
  );
}
