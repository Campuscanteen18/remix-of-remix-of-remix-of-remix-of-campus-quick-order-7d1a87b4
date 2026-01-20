import { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  X, 
  Copy, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Search,
  Eye, 
  Image as ImageIcon 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'; 
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { PendingOrder } from '@/types/superAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type OrderWithNotes = PendingOrder & {
  notes: string | null;
  rejection_reason?: string | null;
};

export function PaymentVerification() {
  const { filters, refreshData } = useSuperAdmin();
  const [orders, setOrders] = useState<OrderWithNotes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<OrderWithNotes | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState(''); // New state for reason
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchPendingOrders = useCallback(async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        campus_id,
        canteen_id,
        total,
        utr_number,
        verification_status,
        payment_status,
        created_at,
        notes, 
        campus:campuses(name, code),
        canteen:canteens(name)
      `) 
      .eq('verification_status', 'pending')
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: true });

    if (filters.campusId) query = query.eq('campus_id', filters.campusId);
    if (filters.canteenId) query = query.eq('canteen_id', filters.canteenId);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending orders:', error);
      toast.error('Failed to load pending orders');
    } else {
      setOrders((data || []) as unknown as OrderWithNotes[]);
    }
    setIsLoading(false);
  }, [filters.campusId, filters.canteenId]);

  useEffect(() => { fetchPendingOrders(); }, [fetchPendingOrders]);

  useEffect(() => {
    const channel = supabase.channel('pending-verification-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchPendingOrders(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPendingOrders]);

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;
    
    // Validate rejection reason
    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData = actionType === 'approve' 
        ? {
            verification_status: 'approved',
            payment_status: 'paid',
            verified_at: new Date().toISOString(),
            verified_by: user?.id, 
            status: 'confirmed' 
          }
        : {
            verification_status: 'rejected',
            payment_status: 'failed',
            verified_at: new Date().toISOString(),
            verified_by: user?.id,
            status: 'cancelled',
            rejection_reason: rejectionReason // Save the reason
          };

      const { error } = await supabase.from('orders').update(updateData as any).eq('id', selectedOrder.id);
      if (error) throw error;

      toast.success(actionType === 'approve' ? 'Payment approved successfully' : 'Payment rejected');
      fetchPendingOrders();
      refreshData();
    } catch (err: any) {
      console.error('Error processing payment:', err);
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
      setSelectedOrder(null);
      setActionType(null);
      setRejectionReason(''); // Reset reason
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getTimeElapsed = (createdAt: string) => formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  const isUrgent = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / (1000 * 60) > 10;

  const getScreenshotUrl = (notes: string | null) => {
    if (!notes) return null;
    if (notes.includes('Screenshot: ')) return notes.split('Screenshot: ')[1].trim();
    if (notes.trim().startsWith('http')) return notes.trim();
    return null;
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(search) ||
      order.customer_name?.toLowerCase().includes(search) ||
      order.customer_email?.toLowerCase().includes(search) ||
      order.utr_number?.toLowerCase().includes(search)
    );
  });

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Verification</h1>
          <p className="text-muted-foreground">The War Room • Approve or reject student UPI payments</p>
        </div>
        <Button variant="outline" onClick={fetchPendingOrders} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Pending</div><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
        <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Urgent ({'>'}10 min)</div><div className="text-2xl font-bold text-destructive">{orders.filter(o => isUrgent(o.created_at)).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Value</div><div className="text-2xl font-bold">{formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Avg Wait Time</div><div className="text-2xl font-bold">{orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60), 0) / orders.length) : 0} min</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><CardTitle>Pending Verifications</CardTitle><CardDescription>Review and process student payment verifications</CardDescription></div>
            <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center"><div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4"><Check className="h-6 w-6 text-green-600" /></div><h3 className="font-semibold text-lg">All Clear!</h3></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UTR / Proof</TableHead>
                    <TableHead>Time Elapsed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const screenshotUrl = getScreenshotUrl(order.notes || null);
                    return (
                      <TableRow key={order.id} className={cn(isUrgent(order.created_at) && "bg-destructive/5")}>
                        <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          <div><p className="font-medium">{order.customer_name}</p><p className="text-xs text-muted-foreground">{order.customer_email}</p></div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1 bg-muted px-2 py-1.5 rounded border">
                               <code className="text-xs font-mono">{order.utr_number || 'No UTR'}</code>
                               <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(order.utr_number!)}><Copy className="h-3 w-3" /></Button>
                             </div>
                             {screenshotUrl ? (
                               <Button variant="outline" size="sm" className="h-8 px-3 gap-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors" onClick={() => setPreviewImage(screenshotUrl)}>
                                 <ImageIcon className="h-4 w-4" /> View Proof
                               </Button>
                             ) : (
                               <span className="text-xs text-muted-foreground italic">No Proof</span>
                             )}
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className={cn("flex items-center gap-1.5", isUrgent(order.created_at) && "text-destructive font-medium")}>
                             <Clock className="h-3.5 w-3.5" />{getTimeElapsed(order.created_at)}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setSelectedOrder(order); setActionType('approve'); }}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelectedOrder(order); setActionType('reject'); }}><X className="h-4 w-4 mr-1" /> Reject</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedOrder && !!actionType} onOpenChange={() => { setSelectedOrder(null); setActionType(null); setRejectionReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' ? (
                 `Approve order ${selectedOrder?.order_number} for ${formatCurrency(selectedOrder?.total || 0)}?`
              ) : (
                 <div className="space-y-3">
                   <p>Reject order {selectedOrder?.order_number}? The student will be notified.</p>
                   
                   {/* REJECTION REASON INPUT */}
                   <div className="space-y-2 text-left">
                     <Label className="text-destructive font-semibold">Reason for Rejection *</Label>
                     <Input 
                       placeholder="e.g. Invalid UTR, Duplicate payment..." 
                       value={rejectionReason}
                       onChange={(e) => setRejectionReason(e.target.value)}
                       className="border-destructive/50 focus-visible:ring-destructive"
                     />
                   </div>
                 </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAction} 
              disabled={isProcessing || (actionType === 'reject' && !rejectionReason.trim())} 
              className={cn(actionType === 'approve' ? "bg-green-600" : "bg-destructive")}
            >
              {isProcessing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Payment Proof</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-hidden rounded-lg border bg-black/5 flex items-center justify-center p-4">
            {previewImage && <img src={previewImage} alt="Payment Proof" className="max-w-full max-h-full object-contain" />}
          </div>
          <div className="flex justify-end"><Button onClick={() => setPreviewImage(null)}>Close</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}