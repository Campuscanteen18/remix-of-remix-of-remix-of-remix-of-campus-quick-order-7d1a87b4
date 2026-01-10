import { TrendingUp, Plus, Minus } from "lucide-react";
import { MenuItem } from "@/types/canteen";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

interface PopularNowProps {
  items: MenuItem[];
}

export function PopularNow({ items }: PopularNowProps) {
  const { cart, addToCart, updateQuantity } = useCart();

  if (items.length === 0) return null;

  const getCartItem = (id: string) => cart.find((i) => i.id === id);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-canteen-warning/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-canteen-warning" />
          </div>
          <h3 className="font-display font-semibold text-base">Popular Now</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-muted">
          Trending
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.slice(0, 4).map((item) => {
          const cartItem = getCartItem(item.id);
          const quantity = cartItem?.quantity || 0;

          return (
            <div
              key={item.id}
              className={cn(
                "relative bg-card rounded-xl overflow-hidden transition-all duration-200",
                quantity > 0 
                  ? "ring-2 ring-primary shadow-medium" 
                  : "shadow-soft hover:shadow-medium",
              )}
            >
              {/* Veg/Non-veg indicator */}
              <div className="absolute top-2 left-2 z-10">
                <div className={cn(
                  "w-4 h-4 rounded-sm border-[1.5px] flex items-center justify-center bg-white/95 backdrop-blur-sm",
                  item.isVeg ? "border-green-600" : "border-red-600",
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    item.isVeg ? "bg-green-600" : "bg-red-600",
                  )} />
                </div>
              </div>

              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                />
              </div>

              {/* Content */}
              <div className="p-2.5">
                <h4 className="font-medium text-xs line-clamp-1 leading-snug">{item.name}</h4>

                <div className="flex items-center justify-between mt-2 gap-1">
                  <span className="font-bold text-sm text-foreground">₹{item.price}</span>

                  {quantity > 0 ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-bold text-xs min-w-[1rem] text-center tabular-nums">
                        {quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
