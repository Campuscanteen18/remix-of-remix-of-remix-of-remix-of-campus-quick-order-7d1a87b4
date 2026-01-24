import { Plus, Minus } from "lucide-react";
// We import the base type but extend it locally to fix the missing 'quantity' error instantly
import { MenuItem as BaseMenuItem } from "@/types/canteen"; 
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// ✅ FIX: Extend the type locally so TypeScript doesn't complain
// This allows you to use 'quantity' even if you haven't updated the global type file yet.
interface MenuItem extends BaseMenuItem {
  quantity?: number;
}

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { cart, addToCart, updateQuantity } = useCart();
  const cartItem = cart.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity || 0;

  // ✅ LOGIC: Item is "Sold Out" if Admin disabled it OR Stock is 0
  // Checks if quantity exists and is less than or equal to 0
  const isOutOfStock = (item.quantity !== undefined && item.quantity !== null) ? item.quantity <= 0 : false;
  
  // Final disabled state: either admin manually set isAvailable=false OR stock ran out
  const isSoldOut = !item.isAvailable || isOutOfStock;

  return (
    <motion.div
      whileHover={!isSoldOut ? { y: -2 } : {}}
      whileTap={!isSoldOut ? { scale: 0.98 } : {}}
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden transition-all duration-200",
        quantity > 0 
          ? "ring-2 ring-primary shadow-medium" 
          : "shadow-soft hover:shadow-medium",
        // If sold out, we lower opacity but keep it visible so they know it exists
        isSoldOut && "opacity-75"
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
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            !isSoldOut && "group-hover:scale-105",
            isSoldOut && "grayscale-[0.5]" // Slight grey effect for sold out
          )}
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />

        {/* ✅ OVERLAY: Shows automatically if Quantity is 0 */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className={cn(
              "px-3 py-1.5 rounded-lg font-bold text-xs border shadow-sm",
              isOutOfStock 
                ? "bg-red-100 text-red-700 border-red-200" // Stock ran out
                : "bg-muted text-muted-foreground border-border" // Admin disabled
            )}>
              {isOutOfStock ? "Out of Stock" : "Unavailable"}
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

          {/* ✅ BUTTON LOGIC */}
          {!isSoldOut ? (
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
          ) : (
            // DISABLED BUTTON STATE
            <Button 
              disabled 
              size="sm" 
              variant="outline"
              className="h-7 px-3 rounded-lg text-xs font-medium border-dashed text-muted-foreground bg-transparent"
            >
              Sold Out
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}