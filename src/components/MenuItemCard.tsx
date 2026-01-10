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
        "border-2",
        quantity > 0 ? "border-primary shadow-lg" : "border-transparent card-shadow",
        !item.isAvailable && "opacity-60",
      )}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {/* Veg/Non-veg indicator */}
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-white p-[2px] rounded-[2px] shadow-sm">
            <div
              className={cn(
                "w-4 h-4 border flex items-center justify-center",
                item.isVeg ? "border-green-600" : "border-red-600",
              )}
            >
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  item.isVeg ? "bg-green-600" : "bg-red-600",
                )}
              />
            </div>
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
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
            <span className="px-4 py-2 rounded-full bg-muted text-muted-foreground font-medium text-sm">
              Not Available
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2 lg:p-3">
        <h3 className="font-semibold text-xs lg:text-sm text-foreground line-clamp-1 leading-tight">
          {item.name}
        </h3>
        <p className="text-[10px] lg:text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>

        <div className="flex items-center justify-between mt-2 gap-1">
          <span className="text-xs lg:text-sm font-bold text-foreground shrink-0">₹{item.price}</span>

          {item.isAvailable &&
            (quantity > 0 ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.id, quantity - 1)}
                  className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
                >
                  <Minus size={12} className="lg:hidden" />
                  <Minus size={14} className="hidden lg:block" />
                </button>
                <span className="font-bold min-w-[1rem] text-center text-xs lg:text-sm">{quantity}</span>
                <button
                  onClick={() => addToCart(item)}
                  className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-md shrink-0"
                >
                  <Plus size={12} className="lg:hidden" />
                  <Plus size={14} className="hidden lg:block" />
                </button>
              </div>
            ) : (
              <Button size="icon" className="w-7 h-7 lg:w-8 lg:h-8 rounded-full shadow-md shrink-0" onClick={() => addToCart(item)}>
                <Plus size={14} className="lg:hidden" />
                <Plus size={16} className="hidden lg:block" />
              </Button>
            ))}
        </div>
      </div>
    </motion.div>
  );
}
