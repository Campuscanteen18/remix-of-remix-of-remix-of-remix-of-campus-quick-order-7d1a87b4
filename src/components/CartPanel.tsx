import { ShoppingBag, Minus, Plus, Trash2, Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function CartPanel() {
  const navigate = useNavigate();
  const { cart, totalItems, totalPrice, updateQuantity, removeFromCart } = useCart();

  if (cart.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base">Your Order</h2>
              <p className="text-xs text-muted-foreground">0 items</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-base text-foreground">Cart is empty</h3>
          <p className="text-sm text-muted-foreground mt-1">Add items from the menu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Your Order</h2>
            <p className="text-xs text-muted-foreground">{totalItems} items</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/50"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                <p className="text-primary font-bold text-sm mt-0.5">₹{item.price}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-bold text-sm min-w-[1.25rem] text-center tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-auto w-6 h-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold text-foreground">₹{totalPrice}</span>
        </div>
        <Separator className="mb-3" />
        <Button 
          className="w-full h-11 font-semibold rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
          onClick={() => navigate('/checkout')}
        >
          Checkout
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
