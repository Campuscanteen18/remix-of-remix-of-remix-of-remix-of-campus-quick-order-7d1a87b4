import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { CategorySidebar } from "@/components/CategorySidebar";
import { MenuItemCard } from "@/components/MenuItemCard";
import { CartPanel } from "@/components/CartPanel";
import { HeroBanner } from "@/components/HeroBanner";
import { MobileCart } from "@/components/MobileCart";
import { MobileProfilePanel } from "@/components/MobileProfilePanel";
import { PopularNow } from "@/components/PopularNow";
import { TimePeriodBanner } from "@/components/TimePeriodBanner";
import { MenuItemSkeletonGrid } from "@/components/skeletons/MenuItemSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SearchBar } from "@/components/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageTransition, staggerContainer, staggerItem } from "@/components/PageTransition";
import { useMenuItems } from "@/hooks/useMenuItems";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, UtensilsCrossed, LayoutDashboard, Ticket } from "lucide-react";

export default function Menu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const {
    filteredItems,
    popularItems,
    currentPeriod,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    refetch,
  } = useMenuItems();

  const handleSignOut = () => {
    // Force a clean sign-out even if a session is still cached briefly
    navigate("/auth?logout=true");
  };

  const userName = user?.fullName || "Guest User";

  // Filter items by search query
  const searchedItems = searchQuery
    ? filteredItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems;

  return (
    <PageTransition>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border flex-none">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <Logo size="sm" />

            <div className="flex items-center gap-2">
              {/* Admin Dashboard Button - only for admins */}
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => navigate("/admin")}
                >
                  <LayoutDashboard size={16} />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Prepaid Token */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate("/prepaid-token")}
                title="Prepaid Tokens"
              >
                <Ticket size={18} />
              </Button>

              <Button variant="outline" onClick={handleSignOut} className="gap-1.5 h-9 px-4 rounded-full">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <CategorySidebar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onProfileClick={() => setIsProfileOpen(true)}
          />

          {/* Menu Grid */}
          <main className="flex-1 overflow-y-auto pb-24 lg:pb-6 scroll-smooth">
            <div className="p-4 lg:p-6">
              <HeroBanner />

              {/* Search Bar */}
              <div className="mb-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search for dishes..."
                />
              </div>

              {/* Time Period Banner - only show for "all" category to avoid confusion */}
              {currentPeriod && !searchQuery && selectedCategory === "all" && <TimePeriodBanner period={currentPeriod} />}

              {/* Popular Now Section */}
              {!isLoading && !error && popularItems.length > 0 && selectedCategory === "all" && !searchQuery && (
                <PopularNow items={popularItems} />
              )}

              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl lg:text-2xl font-bold lowercase">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : selectedCategory === "all"
                      ? currentPeriod
                        ? `${currentPeriod.name} Menu`
                        : "all-items"
                      : selectedCategory}
                </h2>
                {!isLoading && !error && (
                  <span className="text-sm text-muted-foreground">{searchedItems.length} items</span>
                )}
              </div>

              {/* Loading State */}
              {isLoading && <MenuItemSkeletonGrid count={6} />}

              {/* Error State */}
              {error && !isLoading && (
                <ErrorState
                  message={error}
                  onRetry={refetch}
                />
              )}

              {/* Menu Grid */}
              {!isLoading && !error && searchedItems.length > 0 && (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-3"
                >
                  {searchedItems.map((item) => (
                    <motion.div key={item.id} variants={staggerItem}>
                      <MenuItemCard item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Empty State */}
              {!isLoading && !error && searchedItems.length === 0 && (
                <EmptyState
                  icon={UtensilsCrossed}
                  title={searchQuery ? "No results found" : "No items available"}
                  description={
                    searchQuery
                      ? `No items match "${searchQuery}". Try a different search term.`
                      : "No items available in this category right now. Try another category or check back later."
                  }
                  action={{
                    label: searchQuery ? "Clear Search" : "View All Items",
                    onClick: () => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    },
                  }}
                />
              )}
            </div>
          </main>

          {/* Cart Panel - Desktop (only when items in cart) */}
          {totalItems > 0 && (
            <aside className="hidden lg:block w-[360px] bg-card border-l border-border h-full overflow-y-auto">
              <CartPanel />
            </aside>
          )}
        </div>

        {/* Mobile Profile Panel */}
        <MobileProfilePanel
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onSignOut={handleSignOut}
        />

        {/* Mobile Cart */}
        <MobileCart />
      </div>
    </PageTransition>
  );
}
