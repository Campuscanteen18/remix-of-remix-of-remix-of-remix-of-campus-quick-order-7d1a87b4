import { cn } from '@/lib/utils';
import { categories } from '@/data/menuData';
import { UtensilsCrossed, Utensils, Sunrise, Soup, Cookie, Coffee, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onProfileClick?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  all: <UtensilsCrossed size={20} />,
  'main-course': <Utensils size={20} />,
  breakfast: <Sunrise size={20} />,
  lunch: <Soup size={20} />,
  snacks: <Cookie size={20} />,
  beverages: <Coffee size={20} />,
};

export function CategorySidebar({ selectedCategory, onSelectCategory, onProfileClick }: CategorySidebarProps) {
  return (
    <aside className="relative flex flex-col w-[72px] lg:w-20 bg-card border-r border-border h-full">
      {/* Category buttons */}
      <ScrollArea className="flex-1 py-2">
        <div className="flex flex-col gap-0.5 px-1.5">
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                )}
              >
                <div className={cn(
                  'w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground'
                )}>
                  {categoryIcons[category.id] || <UtensilsCrossed size={20} />}
                </div>
                <span className={cn(
                  'text-[10px] font-medium text-center leading-tight max-w-full px-0.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Profile button at bottom */}
      {onProfileClick && (
        <div className="flex-shrink-0 p-2 border-t border-border">
          <button
            onClick={onProfileClick}
            className="w-full flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Profile</span>
          </button>
        </div>
      )}
    </aside>
  );
}
