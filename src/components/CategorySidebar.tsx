import { cn } from '@/lib/utils';
import { categories } from '@/data/menuData';
import { UtensilsCrossed, Utensils, Sun, Soup, Cookie, Coffee, User } from 'lucide-react';

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onProfileClick?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  all: <UtensilsCrossed size={24} />,
  'main-course': <Utensils size={24} />,
  breakfast: <Sun size={24} />,
  lunch: <Soup size={24} />,
  snacks: <Cookie size={24} />,
  beverages: <Coffee size={24} />,
};

export function CategorySidebar({ selectedCategory, onSelectCategory, onProfileClick }: CategorySidebarProps) {
  return (
    <aside className="relative flex flex-col w-20 lg:w-24 bg-card border-r border-border py-3 h-full">
      {/* Category buttons - non-scrollable on mobile, scrollable on desktop */}
      <div className="flex flex-col gap-1 flex-1 overflow-hidden lg:overflow-y-auto lg:pb-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 mx-1.5 rounded-xl transition-all duration-200',
              selectedCategory === category.id
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <div className={cn(
              'w-11 h-11 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center',
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground'
            )}>
              {categoryIcons[category.id] || <UtensilsCrossed size={24} />}
            </div>
            <span className="text-[9px] lg:text-[10px] font-medium text-center leading-tight max-w-full px-0.5">
              {category.name}
            </span>
          </button>
        ))}
        
        {/* Profile button at bottom */}
        {onProfileClick && (
          <button
            onClick={onProfileClick}
            className="flex flex-col items-center gap-1 py-2 px-1 mx-1.5 rounded-xl hover:bg-muted transition-colors mt-auto"
          >
            <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <User size={24} />
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
