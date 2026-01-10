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
import { CampusProvider } from "@/context/CampusContext";
import { ProtectedRoute, AdminRoute, KioskRoute } from "@/components/ProtectedRoute";
import { CampusGate } from "@/components/CampusGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelectCampus from "./pages/SelectCampus";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import StripeSimulator from "./pages/StripeSimulator";
import AdminDashboard from "./pages/AdminDashboard";
import DedicatedScanner from "./pages/DedicatedScanner";
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
      <CampusProvider>
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
                            {/* Public routes */}
                            <Route path="/" element={<Index />} />
                            <Route path="/select-campus" element={<SelectCampus />} />
                            
                            {/* Campus-gated routes */}
                            <Route path="/auth" element={
                              <CampusGate>
                                <Auth />
                              </CampusGate>
                            } />
                            <Route path="/menu" element={
                              <CampusGate>
                                <Menu />
                              </CampusGate>
                            } />
                            <Route path="/checkout" element={
                              <CampusGate>
                                <Checkout />
                              </CampusGate>
                            } />
                            <Route path="/order-success" element={
                              <CampusGate>
                                <OrderSuccess />
                              </CampusGate>
                            } />
                            <Route path="/stripe-sandbox" element={
                              <StripeSimulator />
                            } />
                            <Route path="/my-orders" element={
                              <CampusGate>
                                <MyOrders />
                              </CampusGate>
                            } />
                            <Route path="/order/:orderId" element={
                              <CampusGate>
                                <OrderDetails />
                              </CampusGate>
                            } />
                            <Route path="/profile" element={
                              <CampusGate>
                                <Profile />
                              </CampusGate>
                            } />
                            <Route path="/favorites" element={
                              <CampusGate>
                                <Favorites />
                              </CampusGate>
                            } />
                            <Route 
                              path="/admin" 
                              element={
                                <CampusGate>
                                  <AdminRoute>
                                    <AdminDashboard />
                                  </AdminRoute>
                                </CampusGate>
                              } 
                            />
                            <Route 
                              path="/kiosk-scanner" 
                              element={
                                <CampusGate>
                                  <KioskRoute>
                                    <DedicatedScanner />
                                  </KioskRoute>
                                </CampusGate>
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
      </CampusProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
