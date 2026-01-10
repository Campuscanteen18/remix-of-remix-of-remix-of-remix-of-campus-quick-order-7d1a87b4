import { Plus, Minus } from "lucide-react";
import { MenuItem } from "@/types/canteen";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { cart, addToCart, updateQuantity } = useCart();
  const cartItem = cart.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden transition-all duration-200",
        quantity > 0 
          ? "ring-2 ring-primary shadow-medium" 
          : "shadow-soft hover:shadow-medium",
        !item.isAvailable && "opacity-50 pointer-events-none",
      )}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {/* Veg/Non-veg indicator */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <div className={cn(
            "w-5 h-5 rounded-sm border-[1.5px] flex items-center justify-center bg-white/95 backdrop-blur-sm",
            item.isVeg ? "border-green-600" : "border-red-600",
          )}>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              item.isVeg ? "bg-green-600" : "bg-red-600",
            )} />
          </div>
        </div>

        <img
          src={item.image || '/placeholder.svg'}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />

        {!item.isAvailable && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center backdrop-blur-sm">
            <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium text-xs">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm text-foreground line-clamp-1 leading-snug">
          {item.name}
        </h3>
        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-2.5 gap-2">
          <span className="text-sm font-bold text-foreground">
            ₹{item.price}
          </span>

          {item.isAvailable && (
            quantity > 0 ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQuantity(item.id, quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <span className="font-bold text-sm min-w-[1.25rem] text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => addToCart(item)}
                  className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <Button 
                size="sm" 
                className="h-7 px-3 rounded-lg text-xs font-semibold shadow-none"
                onClick={() => addToCart(item)}
              >
                <Plus size={14} className="mr-1" />
                Add
              </Button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
