import { ShoppingBag, Minus, Plus, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CartPanel() {
  const navigate = useNavigate();
  const { cart, totalItems, totalPrice, updateQuantity, removeFromCart } = useCart();

  if (cart.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-secondary text-secondary-foreground rounded-t-none lg:rounded-t-none">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="font-bold text-lg">My Order</h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Your cart is empty</h3>
          <p className="text-sm text-muted-foreground mt-1">Add items from the menu to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Green */}
      <div className="p-4 bg-secondary text-secondary-foreground">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          <h2 className="font-bold text-lg">My Order ({totalItems} items)</h2>
        </div>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex gap-3"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                <p className="text-primary font-bold text-sm">₹{item.price}</p>
                
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm min-w-[1.5rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-auto w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-foreground font-medium">Total</span>
          <span className="text-2xl font-bold text-foreground">₹{totalPrice}</span>
        </div>
        <Button 
          className="w-full h-12 text-base font-bold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          onClick={() => navigate('/checkout')}
        >
          Proceed to Pay
        </Button>
      </div>
    </div>
  );
}
