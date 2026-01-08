import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { PrinterProvider } from "@/context/PrinterContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { MenuProvider } from "@/context/MenuContext";
import { OrdersProvider } from "@/context/OrdersContext";
import { ProtectedRoute, AdminRoute, KioskRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import QRScanner from "./pages/QRScanner";
import KioskScanner from "./pages/KioskScanner";
import MyOrders from "./pages/MyOrders";
import Profile from "./pages/Profile";
import OrderDetails from "./pages/OrderDetails";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <MenuProvider>
            <OrdersProvider>
              <CartProvider>
                <FavoritesProvider>
                  <PrinterProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/menu" element={<Menu />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/order-success" element={<OrderSuccess />} />
                          <Route path="/my-orders" element={<MyOrders />} />
                          <Route path="/order/:orderId" element={<OrderDetails />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/favorites" element={<Favorites />} />
                          <Route 
                            path="/admin" 
                            element={
                              <AdminRoute>
                                <AdminDashboard />
                              </AdminRoute>
                            } 
                          />
                          <Route 
                            path="/scanner" 
                            element={
                              <KioskRoute>
                                <QRScanner />
                              </KioskRoute>
                            } 
                          />
                          <Route 
                            path="/kiosk-scanner" 
                            element={
                              <KioskRoute>
                                <KioskScanner />
                              </KioskRoute>
                            } 
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </BrowserRouter>
                    </TooltipProvider>
                  </PrinterProvider>
                </FavoritesProvider>
              </CartProvider>
            </OrdersProvider>
          </MenuProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
