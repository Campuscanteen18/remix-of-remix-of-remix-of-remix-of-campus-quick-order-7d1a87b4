import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, LogOut, KeyRound, HelpCircle, Package, Clock, Pencil } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface MobileProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut?: () => void;
}

export function MobileProfilePanel({ 
  isOpen, 
  onClose, 
  onSignOut 
}: MobileProfilePanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  
  // Get user data from auth context
  const userName = authUser?.fullName || 'Guest User';
  const userEmail = authUser?.email || 'guest@example.com';

  // Mock order history
  const [orders] = useState([
    {
      id: 'ORD-2024-001',
      date: '2024-01-08',
      items: ['Masala Dosa', 'Filter Coffee'],
      total: 85,
      status: 'Delivered'
    },
    {
      id: 'ORD-2024-002',
      date: '2024-01-06',
      items: ['Veg Biryani', 'Raita'],
      total: 120,
      status: 'Delivered'
    },
    {
      id: 'ORD-2024-003',
      date: '2024-01-04',
      items: ['Samosa (2)', 'Chai'],
      total: 40,
      status: 'Delivered'
    }
  ]);

  // Dialog states
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  
  // Form states
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleChangePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setChangePasswordOpen(false);
    setPasswordForm({ old: '', new: '', confirm: '' });
    toast({ title: "Password Updated!", description: "Your password has been changed successfully." });
  };

  const handleForgotPassword = () => {
    toast({ title: "Reset Link Sent!", description: `Password reset link sent to ${userEmail}` });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[85%] max-w-md p-0 flex flex-col overflow-hidden">
          <SheetHeader className="p-4 text-left shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">My Account</SheetTitle>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </SheetHeader>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <Separator />
            
            {/* User Header - Clickable to edit profile */}
            <button 
              onClick={() => {
                onClose();
                navigate('/profile');
              }}
              className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
                {getInitials(userName)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{userName}</h3>
                <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
              </div>
              <Pencil size={18} className="text-muted-foreground shrink-0" />
            </button>
            
            <Separator />
            
            {/* Order History Section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-muted-foreground" />
                  <h4 className="font-semibold text-sm text-muted-foreground">MY ORDERS</h4>
                </div>
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/my-orders');
                  }}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 2).map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-muted/50 rounded-xl p-3 border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">{order.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {order.status}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{order.items.join(', ')}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={12} />
                          <span>{new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <span className="font-bold text-primary">₹{order.total}</span>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      onClose();
                      navigate('/my-orders');
                    }}
                  >
                    <Package size={16} />
                    View All Orders
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No orders yet</p>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Security Section */}
            <div className="p-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">SECURITY</h4>
              
              <button 
                onClick={() => setChangePasswordOpen(true)}
                className="w-full flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <KeyRound size={18} className="text-muted-foreground" />
                  <span>Change Password</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
              
              <button 
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline mt-2"
              >
                Forgot Password?
              </button>
            </div>
            
            <Separator />
            
            {/* Support Section */}
            <div className="p-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">SUPPORT</h4>
            
              <button className="w-full flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="text-muted-foreground" />
                  <span>Help & Support</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          
          {/* Sign Out Button */}
          <div className="p-4 border-t border-border bg-card shrink-0">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onSignOut}
            >
              <LogOut size={18} />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>


      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Current Password</Label>
              <Input
                id="old-password"
                type="password"
                value={passwordForm.old}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, old: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
