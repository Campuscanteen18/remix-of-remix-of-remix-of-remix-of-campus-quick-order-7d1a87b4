import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Store,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Mail,
  User
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { Canteen } from '@/types/superAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Campus {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export function CampusManagement() {
  const { campuses: contextCampuses, canteens, refreshData } = useSuperAdmin();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Campus Dialog
  const [showCampusDialog, setShowCampusDialog] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusForm, setCampusForm] = useState({
    name: '',
    code: '',
    address: '',
    is_active: true,
  });
  
  // Canteen Dialog
  const [showCanteenDialog, setShowCanteenDialog] = useState(false);
  const [editingCanteen, setEditingCanteen] = useState<Canteen | null>(null);
  const [canteenForm, setCanteenForm] = useState({
    name: '',
    campus_id: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    upi_id: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    commission_rate: 10,
    is_active: true,
  });

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'campus' | 'canteen'; item: Campus | Canteen } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCampuses = useCallback(async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('campuses')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching campuses:', error);
      toast.error('Failed to load campuses');
    } else {
      setCampuses(data || []);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  const handleSaveCampus = async () => {
    if (!campusForm.name.trim() || !campusForm.code.trim()) {
      toast.error('Name and code are required');
      return;
    }

    setIsProcessing(true);

    try {
      if (editingCampus) {
        const { error } = await supabase
          .from('campuses')
          .update({
            name: campusForm.name.trim(),
            code: campusForm.code.trim().toUpperCase(),
            address: campusForm.address.trim() || null,
            is_active: campusForm.is_active,
          })
          .eq('id', editingCampus.id);

        if (error) throw error;
        toast.success('Campus updated successfully');
      } else {
        const { error } = await supabase
          .from('campuses')
          .insert({
            name: campusForm.name.trim(),
            code: campusForm.code.trim().toUpperCase(),
            address: campusForm.address.trim() || null,
            is_active: campusForm.is_active,
          });

        if (error) throw error;
        toast.success('Campus created successfully');
      }

      fetchCampuses();
      refreshData();
      setShowCampusDialog(false);
      resetCampusForm();
    } catch (err: any) {
      console.error('Error saving campus:', err);
      toast.error(err.message || 'Failed to save campus');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCanteen = async () => {
    if (!canteenForm.name.trim() || !canteenForm.campus_id) {
      toast.error('Name and campus are required');
      return;
    }

    setIsProcessing(true);

    try {
      const data = {
        name: canteenForm.name.trim(),
        campus_id: canteenForm.campus_id,
        owner_name: canteenForm.owner_name.trim() || null,
        owner_email: canteenForm.owner_email.trim() || null,
        owner_phone: canteenForm.owner_phone.trim() || null,
        upi_id: canteenForm.upi_id.trim() || null,
        bank_account_name: canteenForm.bank_account_name.trim() || null,
        bank_account_number: canteenForm.bank_account_number.trim() || null,
        bank_ifsc: canteenForm.bank_ifsc.trim() || null,
        commission_rate: canteenForm.commission_rate,
        is_active: canteenForm.is_active,
      };

      if (editingCanteen) {
        const { error } = await supabase
          .from('canteens')
          .update(data)
          .eq('id', editingCanteen.id);

        if (error) throw error;
        toast.success('Canteen updated successfully');
      } else {
        const { error } = await supabase
          .from('canteens')
          .insert(data);

        if (error) throw error;
        toast.success('Canteen created successfully');
      }

      refreshData();
      setShowCanteenDialog(false);
      resetCanteenForm();
    } catch (err: any) {
      console.error('Error saving canteen:', err);
      toast.error(err.message || 'Failed to save canteen');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsProcessing(true);

    try {
      const table = deleteTarget.type === 'campus' ? 'campuses' : 'canteens';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteTarget.item.id);

      if (error) throw error;

      toast.success(`${deleteTarget.type === 'campus' ? 'Campus' : 'Canteen'} deleted successfully`);
      
      if (deleteTarget.type === 'campus') {
        fetchCampuses();
      }
      refreshData();
    } catch (err: any) {
      console.error('Error deleting:', err);
      toast.error(err.message || 'Failed to delete');
    } finally {
      setIsProcessing(false);
      setDeleteTarget(null);
    }
  };

  const resetCampusForm = () => {
    setCampusForm({ name: '', code: '', address: '', is_active: true });
    setEditingCampus(null);
  };

  const resetCanteenForm = () => {
    setCanteenForm({
      name: '',
      campus_id: '',
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      upi_id: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      commission_rate: 10,
      is_active: true,
    });
    setEditingCanteen(null);
  };

  const openEditCampus = (campus: Campus) => {
    setCampusForm({
      name: campus.name,
      code: campus.code,
      address: campus.address || '',
      is_active: campus.is_active,
    });
    setEditingCampus(campus);
    setShowCampusDialog(true);
  };

  const openEditCanteen = (canteen: Canteen) => {
    setCanteenForm({
      name: canteen.name,
      campus_id: canteen.campus_id,
      owner_name: canteen.owner_name || '',
      owner_email: canteen.owner_email || '',
      owner_phone: canteen.owner_phone || '',
      upi_id: canteen.upi_id || '',
      bank_account_name: canteen.bank_account_name || '',
      bank_account_number: canteen.bank_account_number || '',
      bank_ifsc: canteen.bank_ifsc || '',
      commission_rate: canteen.commission_rate,
      is_active: canteen.is_active,
    });
    setEditingCanteen(canteen);
    setShowCanteenDialog(true);
  };

  const filteredCampuses = campuses.filter(campus => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      campus.name.toLowerCase().includes(search) ||
      campus.code.toLowerCase().includes(search)
    );
  });

  const filteredCanteens = canteens.filter(canteen => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      canteen.name.toLowerCase().includes(search) ||
      canteen.owner_name?.toLowerCase().includes(search) ||
      canteen.campus?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campus & Canteen Management</h1>
          <p className="text-muted-foreground">
            Manage your multi-campus hierarchy
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchCampuses(); refreshData(); }} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campuses" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="campuses" className="gap-2">
              <Building2 className="h-4 w-4" />
              Campuses ({campuses.length})
            </TabsTrigger>
            <TabsTrigger value="canteens" className="gap-2">
              <Store className="h-4 w-4" />
              Canteens ({canteens.length})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Campuses Tab */}
        <TabsContent value="campuses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetCampusForm(); setShowCampusDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Campus
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCampuses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Campuses Found</h3>
                <p className="text-muted-foreground">Add your first campus to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampuses.map((campus) => (
                <Card key={campus.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{campus.name}</h3>
                        <Badge variant="outline" className="mt-1">{campus.code}</Badge>
                      </div>
                      <Badge variant={campus.is_active ? 'default' : 'secondary'}>
                        {campus.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {campus.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{campus.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditCampus(campus)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ type: 'campus', item: campus })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Canteens Tab */}
        <TabsContent value="canteens" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetCanteenForm(); setShowCanteenDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Canteen
            </Button>
          </div>

          {filteredCanteens.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Canteens Found</h3>
                <p className="text-muted-foreground">Add your first canteen to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCanteens.map((canteen) => (
                <Card key={canteen.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{canteen.name}</h3>
                        <p className="text-sm text-muted-foreground">{canteen.campus?.name}</p>
                      </div>
                      <Badge variant={canteen.is_active ? 'default' : 'secondary'}>
                        {canteen.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {canteen.owner_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <User className="h-4 w-4" />
                        <span>{canteen.owner_name}</span>
                      </div>
                    )}
                    {canteen.owner_phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Phone className="h-4 w-4" />
                        <span>{canteen.owner_phone}</span>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mb-3">
                      Commission: {canteen.commission_rate}%
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditCanteen(canteen)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ type: 'canteen', item: canteen })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Campus Dialog */}
      <Dialog open={showCampusDialog} onOpenChange={setShowCampusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCampus ? 'Edit Campus' : 'Add New Campus'}</DialogTitle>
            <DialogDescription>
              {editingCampus ? 'Update campus details.' : 'Create a new campus location.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campus-name">Campus Name *</Label>
                <Input
                  id="campus-name"
                  placeholder="e.g., RC Degree College"
                  value={campusForm.name}
                  onChange={(e) => setCampusForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campus-code">Code *</Label>
                <Input
                  id="campus-code"
                  placeholder="e.g., RCDC"
                  value={campusForm.code}
                  onChange={(e) => setCampusForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campus-address">Address</Label>
              <Input
                id="campus-address"
                placeholder="Full address"
                value={campusForm.address}
                onChange={(e) => setCampusForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="campus-active">Active</Label>
              <Switch
                id="campus-active"
                checked={campusForm.is_active}
                onCheckedChange={(checked) => setCampusForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampusDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCampus} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : editingCampus ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Canteen Dialog */}
      <Dialog open={showCanteenDialog} onOpenChange={setShowCanteenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCanteen ? 'Edit Canteen' : 'Add New Canteen'}</DialogTitle>
            <DialogDescription>
              {editingCanteen ? 'Update canteen details.' : 'Create a new canteen and assign it to a campus.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="canteen-name">Canteen Name *</Label>
                <Input
                  id="canteen-name"
                  placeholder="e.g., Main Cafeteria"
                  value={canteenForm.name}
                  onChange={(e) => setCanteenForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canteen-campus">Campus *</Label>
                <Select
                  value={canteenForm.campus_id}
                  onValueChange={(value) => setCanteenForm(prev => ({ ...prev, campus_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name} ({campus.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Owner Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-name">Owner Name</Label>
                  <Input
                    id="owner-name"
                    placeholder="Full name"
                    value={canteenForm.owner_name}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, owner_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-phone">Phone</Label>
                  <Input
                    id="owner-phone"
                    placeholder="+91 9876543210"
                    value={canteenForm.owner_phone}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, owner_phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="owner-email">Email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  placeholder="owner@example.com"
                  value={canteenForm.owner_email}
                  onChange={(e) => setCanteenForm(prev => ({ ...prev, owner_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Payment Details</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <Input
                    id="upi-id"
                    placeholder="name@upi"
                    value={canteenForm.upi_id}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, upi_id: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Account Name</Label>
                    <Input
                      id="bank-name"
                      placeholder="Name on account"
                      value={canteenForm.bank_account_name}
                      onChange={(e) => setCanteenForm(prev => ({ ...prev, bank_account_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-number">Account Number</Label>
                    <Input
                      id="bank-number"
                      placeholder="Account number"
                      value={canteenForm.bank_account_number}
                      onChange={(e) => setCanteenForm(prev => ({ ...prev, bank_account_number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-ifsc">IFSC Code</Label>
                    <Input
                      id="bank-ifsc"
                      placeholder="IFSC"
                      value={canteenForm.bank_ifsc}
                      onChange={(e) => setCanteenForm(prev => ({ ...prev, bank_ifsc: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission Rate (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    value={canteenForm.commission_rate}
                    onChange={(e) => setCanteenForm(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center justify-between pt-7">
                  <Label htmlFor="canteen-active">Active</Label>
                  <Switch
                    id="canteen-active"
                    checked={canteenForm.is_active}
                    onCheckedChange={(checked) => setCanteenForm(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCanteenDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCanteen} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : editingCanteen ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'campus' ? 'Campus' : 'Canteen'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.item?.name}</strong>?
              This action cannot be undone.
              {deleteTarget?.type === 'campus' && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete all canteens associated with this campus.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
