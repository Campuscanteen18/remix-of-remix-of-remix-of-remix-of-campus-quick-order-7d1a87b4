import { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  X, 
  Copy, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { PendingOrder } from '@/types/superAdmin';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function PaymentVerification() {
  const { filters, refreshData } = useSuperAdmin();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
        campus:campuses(name, code),
        canteen:canteens(name)
      `)
      .eq('verification_status', 'pending')
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: true });

    if (filters.campusId) {
      query = query.eq('campus_id', filters.campusId);
    }
    if (filters.canteenId) {
      query = query.eq('canteen_id', filters.canteenId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending orders:', error);
      toast.error('Failed to load pending orders');
    } else {
      setOrders((data || []) as unknown as PendingOrder[]);
    }
    
    setIsLoading(false);
  }, [filters.campusId, filters.canteenId]);

  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('pending-verification-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingOrders]);

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;

    setIsProcessing(true);

    try {
      const updateData = actionType === 'approve' 
        ? {
            verification_status: 'approved' as const,
            payment_status: 'success',
            verified_at: new Date().toISOString(),
            status: 'confirmed' as const
          }
        : {
            verification_status: 'rejected' as const,
            payment_status: 'failed',
            verified_at: new Date().toISOString(),
            status: 'pending' as const
          };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast.success(
        actionType === 'approve' 
          ? 'Payment approved successfully' 
          : 'Payment rejected'
      );

      fetchPendingOrders();
      refreshData();
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error('Failed to process payment');
    } finally {
      setIsProcessing(false);
      setSelectedOrder(null);
      setActionType(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getTimeElapsed = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  const isUrgent = (createdAt: string) => {
    const minutesElapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
    return minutesElapsed > 10;
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Verification</h1>
          <p className="text-muted-foreground">
            The War Room • Approve or reject student UPI payments
          </p>
        </div>
        <Button variant="outline" onClick={fetchPendingOrders} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Pending</div>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              Urgent ({'>'}10 min)
            </div>
            <div className="text-2xl font-bold text-destructive">
              {orders.filter(o => isUrgent(o.created_at)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">
              {formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg Wait Time</div>
            <div className="text-2xl font-bold">
              {orders.length > 0 
                ? Math.round(orders.reduce((sum, o) => 
                    sum + (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60), 0
                  ) / orders.length)
                : 0
              } min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Pending Verifications</CardTitle>
              <CardDescription>
                Review and process student payment verifications
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">All Clear!</h3>
              <p className="text-muted-foreground mt-1">
                No pending payment verifications at the moment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UTR/Reference</TableHead>
                    <TableHead>Time Elapsed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className={cn(
                        isUrgent(order.created_at) && "bg-destructive/5 hover:bg-destructive/10"
                      )}
                    >
                      <TableCell className="font-mono font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.campus?.code || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        {order.utr_number ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {order.utr_number}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(order.utr_number!)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-1.5",
                          isUrgent(order.created_at) && "text-destructive font-medium"
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                          {getTimeElapsed(order.created_at)}
                          {isUrgent(order.created_at) && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedOrder(order);
                              setActionType('approve');
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedOrder(order);
                              setActionType('reject');
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedOrder && !!actionType} onOpenChange={() => {
        setSelectedOrder(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' ? (
                <>
                  You are about to approve payment for order{' '}
                  <strong>{selectedOrder?.order_number}</strong> of{' '}
                  <strong>{formatCurrency(selectedOrder?.total || 0)}</strong>.
                  This will mark the order as confirmed and notify the kitchen.
                </>
              ) : (
                <>
                  You are about to reject payment for order{' '}
                  <strong>{selectedOrder?.order_number}</strong>.
                  The student will be notified that their payment was not verified.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isProcessing}
              className={cn(
                actionType === 'approve' 
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-destructive hover:bg-destructive/90"
              )}
            >
              {isProcessing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
