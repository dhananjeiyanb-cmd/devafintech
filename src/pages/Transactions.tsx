import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { Search, Download, ArrowUpRight, ArrowDownRight, X, Pencil, Trash2 } from "lucide-react";
import { useBudget } from "@/contexts/BudgetContext";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const categories = ["All", "Income", "Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Savings", "Others"];
const modes = ["All", "UPI", "Card", "Cash", "Bank Transfer", "Net Banking"];

const Transactions = () => {
  const { transactions, getTotalIncome, getTotalSpent, refreshTransactions } = useBudget();
  const { user } = useAuth();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [savingsGoalFilter, setSavingsGoalFilter] = useState<string | null>(null);
  const [savingsGoalTitle, setSavingsGoalTitle] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMode, setEditMode] = useState("");

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.filterBySavingsGoal) {
      setSavingsGoalFilter(location.state.filterBySavingsGoal);
      setSavingsGoalTitle(location.state.savingsGoalTitle || "");
    }
  }, [location.state]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesMode = selectedMode === "All" || t.mode === selectedMode;
    return matchesSearch && matchesCategory && matchesMode;
  });

  const openEdit = (tx: any) => {
    setEditingTx(tx);
    setEditAmount(String(Math.abs(tx.amount)));
    setEditDescription(tx.description);
    setEditCategory(tx.category);
    setEditMode(tx.mode || "Cash");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingTx || !user) return;
    try {
      const newAmount = editingTx.amount < 0 ? -Math.abs(parseFloat(editAmount)) : Math.abs(parseFloat(editAmount));
      const { error } = await supabase
        .from("transactions")
        .update({
          amount: newAmount,
          description: editDescription,
          category: editCategory,
          mode: editMode,
        })
        .eq("id", editingTx.id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Transaction updated");
      setEditDialogOpen(false);
      await refreshTransactions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update transaction");
    }
  };

  const handleDelete = async () => {
    if (!deletingTxId || !user) return;
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deletingTxId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Transaction deleted");
      setDeleteDialogOpen(false);
      setDeletingTxId(null);
      await refreshTransactions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete transaction");
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Income: "text-income bg-success-light",
      Food: "text-budget-warning bg-warning-light",
      Transport: "text-primary bg-primary/10",
      Shopping: "text-expense bg-destructive/10",
      Bills: "text-muted-foreground bg-muted",
      Entertainment: "text-accent-vivid bg-accent",
      Health: "text-income bg-success-light",
      Savings: "text-savings bg-accent",
      Others: "text-muted-foreground bg-muted",
    };
    return colors[category] || "text-muted-foreground bg-muted";
  };

  const getModeIcon = (mode: string) => {
    const icons: Record<string, string> = { UPI: "💳", Card: "💳", Cash: "💵", "Bank Transfer": "🏦", "Net Banking": "🌐" };
    return icons[mode] || "💰";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Track and manage all your financial transactions</p>
          </div>
          <Button className="gradient-primary shadow-glow">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {savingsGoalFilter && (
          <Alert className="border-savings bg-savings/10">
            <AlertDescription className="flex items-center justify-between">
              <span className="text-savings">
                Showing transactions for: <strong>{savingsGoalTitle}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={() => { setSavingsGoalFilter(null); setSavingsGoalTitle(""); }} className="h-auto p-1 text-savings hover:text-savings/80">
                <X className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search transactions..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Payment Mode" /></SelectTrigger>
                <SelectContent>
                  {modes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Total Income</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income">₹{getTotalIncome().toLocaleString()}</div>
              <div className="flex items-center text-xs text-income"><ArrowUpRight className="w-3 h-3 mr-1" />This month</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Total Expenses</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-expense">₹{getTotalSpent().toLocaleString()}</div>
              <div className="flex items-center text-xs text-expense"><ArrowDownRight className="w-3 h-3 mr-1" />This month</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Net Savings</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-savings">₹{(getTotalIncome() - getTotalSpent()).toLocaleString()}</div>
              <div className="flex items-center text-xs text-savings"><ArrowUpRight className="w-3 h-3 mr-1" />This month</div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction List */}
        <Card className="gradient-card shadow-card border-0">
          <CardHeader><CardTitle className="text-card-foreground">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-lg">
                      {getModeIcon(tx.mode)}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{tx.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-muted-foreground">{tx.date}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(tx.category)}`}>{tx.category}</span>
                        <span className="text-xs text-muted-foreground">{tx.mode}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${tx.amount > 0 ? 'text-income' : 'text-expense'}`}>
                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.amount > 0 ? 'Credit' : 'Debit'}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeletingTxId(tx.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12"><p className="text-muted-foreground">No transactions found.</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Payment Mode</label>
              <Select value={editMode} onValueChange={setEditMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modes.filter(m => m !== "All").map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-primary" onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Transaction</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this transaction? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Transactions;
