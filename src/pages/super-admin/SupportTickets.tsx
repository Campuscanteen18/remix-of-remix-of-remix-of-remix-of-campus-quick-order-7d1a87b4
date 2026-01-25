import { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User,
  Shield,
  RefreshCw,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  campus_id: string;
  order_id: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  campus?: { name: string; code: string };
  profile?: { full_name: string; email: string; phone: string };
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface TicketStats {
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  today_tickets: number;
}

export function SupportTickets() {
  const { user } = useAuth();
  const { filters } = useSuperAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Dialog states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          campus:campuses(name, code)
        `)
        .order('created_at', { ascending: false });

      if (filters.campusId) {
        query = query.eq('campus_id', filters.campusId);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profile data for each ticket
      const ticketsWithProfiles = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('user_id', ticket.user_id)
            .single();
          
          return { ...ticket, profile: profileData };
        })
      );

      setTickets(ticketsWithProfiles);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketStats = async () => {
    const { data, error } = await supabase.rpc('get_ticket_stats');
    if (!error && data) {
      setTicketStats(data as unknown as TicketStats);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: 'admin',
          message: newMessage.trim()
        });

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
      }

      setNewMessage('');
      fetchMessages(selectedTicket.id);
      fetchTickets();
      fetchTicketStats();
      toast.success('Reply sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setSelectedTicket({ ...selectedTicket, status: newStatus });
      fetchTickets();
      fetchTicketStats();
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchTicketStats();
  }, [filters.campusId, statusFilter, categoryFilter]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
          fetchTicketStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query) ||
      ticket.profile?.full_name?.toLowerCase().includes(query) ||
      ticket.profile?.email?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'payment':
        return <Badge variant="outline" className="border-blue-500/30 text-blue-600">Payment</Badge>;
      case 'order':
        return <Badge variant="outline" className="border-orange-500/30 text-orange-600">Order</Badge>;
      case 'account':
        return <Badge variant="outline" className="border-purple-500/30 text-purple-600">Account</Badge>;
      case 'general':
        return <Badge variant="outline" className="border-muted-foreground/30">General</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />;
      case 'high':
        return <span className="w-2 h-2 rounded-full bg-orange-500" />;
      case 'normal':
        return <span className="w-2 h-2 rounded-full bg-blue-500" />;
      case 'low':
        return <span className="w-2 h-2 rounded-full bg-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            Manage student queries and provide support
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchTickets(); fetchTicketStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold text-red-600">{ticketStats?.open_tickets ?? 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{ticketStats?.in_progress_tickets ?? 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{ticketStats?.resolved_tickets ?? 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Tickets</p>
                <p className="text-2xl font-bold">{ticketStats?.today_tickets ?? 0}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket #, subject, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tickets ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getPriorityIndicator(ticket.priority)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-muted-foreground">
                            {ticket.ticket_number}
                          </span>
                          {getStatusBadge(ticket.status)}
                          {getCategoryBadge(ticket.category)}
                        </div>
                        <p className="font-medium truncate mt-1">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {ticket.profile?.full_name || 'Unknown'} • {ticket.campus?.name || 'Unknown Campus'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedTicket?.ticket_number}</span>
                  {selectedTicket && getStatusBadge(selectedTicket.status)}
                </DialogTitle>
                <DialogDescription>{selectedTicket?.subject}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedTicket && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedTicket.profile?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.profile?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <div className="mt-1">{getCategoryBadge(selectedTicket.category)}</div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 mb-4">
                <Select
                  value={selectedTicket.status}
                  onValueChange={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                {isUpdatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No messages yet</p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          msg.sender_type === 'admin' && "flex-row-reverse"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          msg.sender_type === 'admin' 
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}>
                          {msg.sender_type === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          msg.sender_type === 'admin'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}>
                          <p className="text-sm">{msg.message}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            msg.sender_type === 'admin' ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Reply Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 resize-none"
                  rows={2}
                />
                <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
