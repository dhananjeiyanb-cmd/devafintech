
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, Users, AlertTriangle, TrendingUp, LogOut, Eye, 
  Phone, Mail, IndianRupee, Activity, HeartPulse, FileText
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Lead {
  id: string;
  user_id: string;
  tenant_id: string;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  overspend_percentage: number;
  lead_status: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      
      if (data && data.length > 0) {
        setIsAdmin(true);
        await loadLeads();
      } else {
        setIsAdmin(false);
        toast.error('Access denied. You are not an admin.');
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setLeads(data as Lead[]);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ lead_status: status })
        .eq('id', leadId);

      if (error) throw error;
      setLeads(leads.map(l => l.id === leadId ? { ...l, lead_status: status } : l));
      toast.success(`Lead status updated to ${status}`);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  const updateLeadNotes = async (leadId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes })
        .eq('id', leadId);

      if (error) throw error;
      setLeads(leads.map(l => l.id === leadId ? { ...l, notes } : l));
      toast.success('Notes updated');
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: 'bg-destructive/10 text-destructive border-destructive/20',
      contacted: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      converted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    };
    return (
      <Badge className={`${variants[status] || variants.new} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground">You don't have admin privileges to access this page.</p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const newLeads = leads.filter(l => l.lead_status === 'new').length;
  const contactedLeads = leads.filter(l => l.lead_status === 'contacted').length;
  const convertedLeads = leads.filter(l => l.lead_status === 'converted').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">FinAI Admin</h1>
            <p className="text-xs text-muted-foreground">Lead Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {user?.email}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/auth'); }}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold text-foreground">{leads.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Leads</p>
                <p className="text-2xl font-bold text-destructive">{newLeads}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contacted</p>
                <p className="text-2xl font-bold text-amber-600">{contactedLeads}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold text-emerald-600">{convertedLeads}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-destructive" />
              Medical Insurance Leads
            </CardTitle>
            <CardDescription>
              Users who have exceeded their medical/health budget — potential leads for insurance companies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No leads generated yet.</p>
                <p className="text-sm">Leads are auto-generated when users exceed their medical budget.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Overspend %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{lead.user_name || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{lead.user_email || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{lead.user_phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">
                          🏥 {lead.category}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{lead.allocated_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-destructive font-medium">
                        ₹{lead.spent_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-destructive font-bold">{lead.overspend_percentage}%</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.lead_status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-destructive" />
              Lead Details
            </DialogTitle>
            <DialogDescription>
              Medical budget overspend lead for insurance companies
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4">
              {/* User Info */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" /> Member Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedLead.user_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                      <p className="font-medium">{selectedLead.user_email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
                      <p className="font-medium">{selectedLead.user_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lead Date</p>
                      <p className="font-medium">{new Date(selectedLead.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spending Info */}
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Spending Details
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium">🏥 {selectedLead.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Allocated</p>
                      <p className="font-medium">₹{selectedLead.allocated_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-medium text-destructive">₹{selectedLead.spent_amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">Overspend</p>
                    <p className="text-2xl font-bold text-destructive">{selectedLead.overspend_percentage}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Status & Actions */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Update Status</p>
                  <Select 
                    value={selectedLead.lead_status} 
                    onValueChange={(v) => {
                      updateLeadStatus(selectedLead.id, v);
                      setSelectedLead({ ...selectedLead, lead_status: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">🔴 New</SelectItem>
                      <SelectItem value="contacted">🟡 Contacted</SelectItem>
                      <SelectItem value="converted">🟢 Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <Textarea
                  placeholder="Add notes about this lead..."
                  value={selectedLead.notes || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                  onBlur={() => selectedLead.notes !== null && updateLeadNotes(selectedLead.id, selectedLead.notes || '')}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
