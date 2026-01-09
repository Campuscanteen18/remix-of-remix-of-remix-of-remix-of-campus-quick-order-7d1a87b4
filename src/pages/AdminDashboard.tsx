import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAuth } from "@/context/AuthContext";
import {
  useAdminMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useAdminOrders,
  useUpdateOrderStatus,
  useOrderStats,
} from "@/hooks/useAdminData";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toast } from "sonner";
import {
  LogOut,
  QrCode,
  ArrowLeft,
  LayoutDashboard,
  UtensilsCrossed,
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Users,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Package,
  Upload,
  ImageIcon,
  X,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const ADMIN_CATEGORIES = [
  { id: "main-course", name: "Main Course" },
  { id: "breakfast", name: "Breakfast" },
  { id: "lunch", name: "Lunch" },
  { id: "snacks", name: "Snacks" },
  { id: "beverages", name: "Beverages" },
] as const;

const TIME_PERIODS = [
  { id: "breakfast", name: "Breakfast (7-11 AM)" },
  { id: "lunch", name: "Lunch (11 AM - 3 PM)" },
  { id: "snacks", name: "Snacks (3-6 PM)" },
  { id: "dinner", name: "Dinner (6-10 PM)" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout: pinLogout } = useAdminAuth();
  const { logout: authLogout } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    quantity: "",
    category: "snacks",
    image: "",
    is_veg: true,
    is_popular: false,
    is_available: true,
    available_time_periods: [] as string[],
  });

  // Hooks
  const { data: menuItems = [], isLoading: menuLoading } = useAdminMenuItems();
  const { data: orders = [], isLoading: ordersLoading } = useAdminOrders();
  const { data: stats } = useOrderStats();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();
  const updateOrderStatus = useUpdateOrderStatus();
  const { uploadImage, isUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSignOut = async () => {
    // Clear admin PIN session + Supabase session
    pinLogout();
    await authLogout();
    navigate("/auth?logout=true");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      quantity: "",
      category: "snacks",
      image: "",
      is_veg: true,
      is_popular: false,
      is_available: true,
      available_time_periods: [],
    });
    setEditingItem(null);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    try {
      let imageUrl = formData.image;

      // Upload image if a new file was selected
      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (!uploadedUrl) {
          toast.error("Failed to upload image");
          return;
        }
        imageUrl = uploadedUrl;
      }

      if (editingItem) {
        await updateMenuItem.mutateAsync({
          id: editingItem,
          name: formData.name,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity) || 0,
          category: formData.category,
          image: imageUrl || undefined,
          is_veg: formData.is_veg,
          is_popular: formData.is_popular,
          is_available: formData.is_available,
          available_time_periods: formData.available_time_periods,
        });
        toast.success("Item updated successfully");
      } else {
        await createMenuItem.mutateAsync({
          name: formData.name,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity) || 0,
          category: formData.category,
          image: imageUrl || undefined,
          is_veg: formData.is_veg,
          is_popular: formData.is_popular,
          is_available: formData.is_available,
          available_time_periods: formData.available_time_periods,
        });
        toast.success("Item added successfully");
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save item");
    }
  };

  const handleEdit = (item: (typeof menuItems)[0]) => {
    setFormData({
      name: item.name,
      price: item.price.toString(),
      quantity: (item.quantity ?? 0).toString(),
      category: item.category,
      image: item.image || "",
      is_veg: item.is_veg ?? true,
      is_popular: item.is_popular ?? false,
      is_available: item.is_available ?? true,
      available_time_periods: item.available_time_periods || [],
    });
    setEditingItem(item.id);
    setSelectedFile(null);
    setImagePreview(null); // Will show existing image from formData.image
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteMenuItem.mutateAsync(id);
        toast.success("Item deleted");
      } catch (error) {
        toast.error("Failed to delete item");
      }
    }
  };

  const handleToggleAvailability = async (id: string, currentValue: boolean) => {
    try {
      await updateMenuItem.mutateAsync({ id, is_available: !currentValue });
      toast.success(`Item ${!currentValue ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

  const handleOrderStatusChange = async (id: string, status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'collected' | 'cancelled') => {
    try {
      await updateOrderStatus.mutateAsync({ id, status });
      toast.success("Order status updated");
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const chartData = stats?.chartData || [];

  // Low stock items (quantity <= 10)
  const lowStockItems = menuItems
    .filter((item) => (item.quantity ?? 0) <= 10)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? 0,
      category: ADMIN_CATEGORIES.find((c) => c.id === item.category)?.name || item.category,
    }))
    .sort((a, b) => a.quantity - b.quantity);

  const handleRestockClick = (itemId: string) => {
    const item = menuItems.find((i) => i.id === itemId);
    if (item) {
      handleEdit(item);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <Logo size="sm" />

          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/kiosk-scanner")} className="gap-2 rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <QrCode size={18} />
              <span className="hidden sm:inline">🚀 Launch Kiosk</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your canteen</p>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="bg-muted rounded-full p-1 h-auto flex-wrap justify-start">
            <TabsTrigger
              value="analytics"
              className="gap-1.5 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <TrendingUp size={14} className="hidden sm:block" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="gap-1.5 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Package size={14} className="hidden sm:block" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="menu"
              className="gap-1.5 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <UtensilsCrossed size={14} className="hidden sm:block" />
              Menu
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="rounded-2xl card-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Revenue (7d)</p>
                      <p className="text-base sm:text-xl font-bold truncate">
                        ₹{(stats?.totalRevenue || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl card-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Orders (7d)</p>
                      <p className="text-base sm:text-xl font-bold">{stats?.totalOrders || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl card-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Avg Order</p>
                      <p className="text-base sm:text-xl font-bold">₹{stats?.avgOrderValue || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl card-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Today</p>
                      <p className="text-base sm:text-xl font-bold">{stats?.todayOrders || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                          }}
                        />
                        <Bar dataKey="orders" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
              <Card className="rounded-2xl card-shadow border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-destructive" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-background">
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-xs text-destructive font-semibold">Only {item.quantity} left</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="rounded-2xl card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 20).map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl bg-muted/50 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base">{order.id}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                order.status === "collected"
                                  ? "bg-primary/10 text-primary"
                                  : order.status === "cancelled"
                                    ? "bg-destructive/10 text-destructive"
                                    : order.status === "ready"
                                      ? "bg-secondary/10 text-secondary"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            ₹{order.total} • {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleOrderStatusChange(order.id, value as 'pending' | 'confirmed' | 'preparing' | 'ready' | 'collected' | 'cancelled')}
                        >
                          <SelectTrigger className="w-full sm:w-32 h-9 rounded-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="preparing">Preparing</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="collected">Collected</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-4">
            <Card className="rounded-2xl card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Menu Items</CardTitle>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) resetForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="rounded-full gap-2">
                      <Plus size={16} />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Item name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity (Stock) *</Label>
                        <Input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          placeholder="e.g., 150"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Price *</Label>
                          <Input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ADMIN_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Image</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        {imagePreview || formData.image ? (
                          <div className="relative">
                            <img
                              src={imagePreview || formData.image}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-xl border border-border"
                            />
                            <button
                              type="button"
                              onClick={clearImage}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            {isUploading ? (
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload image</span>
                              </>
                            )}
                          </button>
                        )}

                        {!imagePreview && !formData.image && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full text-xs text-primary hover:underline"
                          >
                            or drag and drop
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Available Time Periods</Label>
                        <div className="flex flex-wrap gap-2">
                          {TIME_PERIODS.map((period) => (
                            <button
                              key={period.id}
                              type="button"
                              onClick={() => {
                                const periods = formData.available_time_periods.includes(period.id)
                                  ? formData.available_time_periods.filter((p) => p !== period.id)
                                  : [...formData.available_time_periods, period.id];
                                setFormData({ ...formData, available_time_periods: periods });
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                formData.available_time_periods.includes(period.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {period.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Vegetarian</Label>
                        <Switch
                          checked={formData.is_veg}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_veg: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Popular</Label>
                        <Switch
                          checked={formData.is_popular}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Available</Label>
                        <Switch
                          checked={formData.is_available}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={createMenuItem.isPending || updateMenuItem.isPending}
                      >
                        {createMenuItem.isPending || updateMenuItem.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : editingItem ? (
                          "Update Item"
                        ) : (
                          "Add Item"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {menuLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : menuItems.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No menu items yet</p>
                ) : (
                  <div className="space-y-3">
                    {menuItems.map((item) => {
                      const categoryName = ADMIN_CATEGORIES.find((c) => c.id === item.category)?.name || item.category;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                                {item.is_veg && (
                                  <span className="w-4 h-4 rounded border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {categoryName} • ₹{item.price} • Stock: {item.quantity ?? 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end flex-shrink-0">
                            <Switch
                              checked={item.is_available ?? true}
                              onCheckedChange={() => handleToggleAvailability(item.id, item.is_available ?? true)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs sm:text-sm"
                              onClick={() => handleEdit(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-full text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
