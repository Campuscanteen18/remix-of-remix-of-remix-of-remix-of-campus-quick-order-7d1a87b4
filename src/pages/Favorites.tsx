import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuItemCard } from '@/components/MenuItemCard';
import { EmptyState } from '@/components/EmptyState';
import { useFavorites } from '@/context/FavoritesContext';
import { menuItems } from '@/data/menuData';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';

export default function Favorites() {
  const navigate = useNavigate();
  const { favorites } = useFavorites();

  const favoriteItems = menuItems.filter((item) => favorites.includes(item.id));

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-semibold">My Favorites</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="p-4">
          {favoriteItems.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              description="Start adding your favorite items by tapping the heart icon on any menu item."
              action={{
                label: 'Browse Menu',
                onClick: () => navigate('/menu'),
              }}
            />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {favoriteItems.map((item) => (
                <motion.div key={item.id} variants={staggerItem}>
                  <MenuItemCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
