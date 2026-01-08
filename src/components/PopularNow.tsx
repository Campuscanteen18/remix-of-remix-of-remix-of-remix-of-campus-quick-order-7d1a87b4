import { TrendingUp, Plus, Minus, Check } from "lucide-react";
import { MenuItem } from "@/types/canteen";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PopularNowProps {
  items: MenuItem[];
}

export function PopularNow({ items }: PopularNowProps) {
  const { cart, addToCart, updateQuantity } = useCart();

  if (items.length === 0) return null;

  const getCartItem = (id: string) => cart.find((i) => i.id === id);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg lg:text-xl">Popular Right Now</h3>
        </div>
        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
          Trending
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {items.slice(0, 4).map((item) => {
          const cartItem = getCartItem(item.id);
          const quantity = cartItem?.quantity || 0;
          const popularity = Math.floor(Math.random() * 10) + 90; // Mock popularity 90-99%

          return (
            <div
              key={item.id}
              className={cn(
                "relative bg-card rounded-2xl overflow-hidden transition-all duration-200",
                "border-2",
                quantity > 0 ? "border-primary shadow-lg" : "border-transparent card-shadow",
              )}
            >
              {/* Veg/Non-veg indicator (UPDATED) */}
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-white p-[2px] rounded-[2px] shadow-sm">
                  <div
                    className={cn(
                      "w-4 h-4 border flex items-center justify-center",
                      // Outer Square Border
                      item.isVeg ? "border-green-600" : "border-red-600",
                    )}
                  >
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        // Inner Circle Fill
                        item.isVeg ? "bg-green-600" : "bg-red-600",
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Popularity badge */}
              <div className="absolute top-2 right-2 z-10">
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/90 text-xs font-medium text-primary shadow-sm">
                  <TrendingUp size={10} />
                  {popularity}%
                </span>
              </div>

              {/* Selected indicator */}
              {quantity > 0 && (
                <div className="absolute top-2 right-2 z-20">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground" />
                  </div>
                </div>
              )}

              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              {/* Content */}
              <div className="p-3">
                <h4 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.25rem]">{item.name}</h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>

                <div className="flex items-center justify-between mt-2 gap-1">
                  <span className="font-bold text-foreground shrink-0 text-sm">₹{item.price}</span>

                  {quantity > 0 ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                        className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
                      >
                        <Minus size={10} className="lg:hidden" />
                        <Minus size={12} className="hidden lg:block" />
                      </button>
                      <span className="font-bold text-xs min-w-[0.75rem] text-center">{quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                      >
                        <Plus size={10} className="lg:hidden" />
                        <Plus size={12} className="hidden lg:block" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-md shrink-0"
                    >
                      <Plus size={12} className="lg:hidden" />
                      <Plus size={14} className="hidden lg:block" />
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
