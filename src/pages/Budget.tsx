import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { Plus, Target, AlertTriangle, CheckCircle, TrendingDown, Wallet, Info, Calculator, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBudget } from "@/contexts/BudgetContext";
import { toast } from "sonner";

const Budget = () => {
  const { 
    budgets, income, addIncome, addBudget, updateBudgetAmount, deleteBudget,
    getTotalBudget, getTotalSpent, getTotalIncome, getCurrentBalance 
  } = useBudget();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newBudget, setNewBudget] = useState({ name: "", budget: "", icon: "💰" });
  const [newIncome, setNewIncome] = useState({ name: "Salary", amount: "", date: new Date().toISOString().split('T')[0] });

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<any>(null);

  const currentBalance = getCurrentBalance();
  const canCreateBudget = currentBalance > 0;

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return { status: "exceeded", color: "budget-danger", icon: AlertTriangle };
    if (percentage >= 80) return { status: "warning", color: "budget-warning", icon: AlertTriangle };
    return { status: "good", color: "budget-good", icon: CheckCircle };
  };

  const totalBudget = getTotalBudget();
  const totalSpent = getTotalSpent();

  const handleAddBudget = () => {
    if (newBudget.name && newBudget.budget) {
      addBudget({ name: newBudget.name, budget: parseInt(newBudget.budget), color: "hsl(var(--primary))", icon: newBudget.icon });
      setNewBudget({ name: "", budget: "", icon: "💰" });
      setIsDialogOpen(false);
    }
  };

  const handleAddIncome = () => {
    if (newIncome.name && newIncome.amount) {
      addIncome({ name: newIncome.name, amount: parseInt(newIncome.amount), date: newIncome.date });
      setNewIncome({ name: "Salary", amount: "", date: new Date().toISOString().split('T')[0] });
      setIsIncomeDialogOpen(false);
    }
  };

  const openEditDialog = (budget: any) => {
    setEditingBudget(budget);
    setEditAmount(String(budget.allocated));
    setEditDialogOpen(true);
  };

  const handleEditBudget = async () => {
    if (!editingBudget) return;
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount <= 0) { toast.error("Enter a valid amount"); return; }
    const success = await updateBudgetAmount(editingBudget.id, newAmount);
    if (success) setEditDialogOpen(false);
  };

  const openDeleteDialog = (budget: any) => {
    setDeletingBudget(budget);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;
    await deleteBudget(deletingBudget.id);
    setDeleteDialogOpen(false);
    setDeletingBudget(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Budget Management</h1>
            <p className="text-muted-foreground">Set and track your monthly spending limits</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-income text-income hover:bg-income/10">
                  <Wallet className="w-4 h-4 mr-2" /> Add Income
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Income Source</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Income Source</Label>
                    <Select value={newIncome.name} onValueChange={(v) => setNewIncome({ ...newIncome, name: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input type="number" placeholder="45000" value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={newIncome.date} onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })} />
                  </div>
                  <Button onClick={handleAddIncome} className="w-full gradient-primary">Add Income Source</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary shadow-glow" disabled={!canCreateBudget} title={!canCreateBudget ? "Add income first to create a budget" : ""}>
                  <Plus className="w-4 h-4 mr-2" /> Add Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Budget Category</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Balance indicator */}
                  <div className="p-3 rounded-lg bg-income/10 border border-income/20">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-lg font-bold text-income">₹{Math.round(currentBalance).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Category Name</Label>
                    <Input placeholder="e.g., Groceries" value={newBudget.name} onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Monthly Budget (₹)</Label>
                    <Input type="number" placeholder="5000" value={newBudget.budget} onChange={(e) => setNewBudget({ ...newBudget, budget: e.target.value })} max={currentBalance} />
                    {newBudget.budget && parseInt(newBudget.budget) > currentBalance && (
                      <p className="text-xs text-destructive mt-1">Amount exceeds available balance</p>
                    )}
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <Select value={newBudget.icon} onValueChange={(v) => setNewBudget({ ...newBudget, icon: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="💰">💰 Money</SelectItem>
                        <SelectItem value="🍽️">🍽️ Food</SelectItem>
                        <SelectItem value="🚗">🚗 Transport</SelectItem>
                        <SelectItem value="🛍️">🛍️ Shopping</SelectItem>
                        <SelectItem value="🎬">🎬 Entertainment</SelectItem>
                        <SelectItem value="🏥">🏥 Healthcare</SelectItem>
                        <SelectItem value="📚">📚 Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddBudget} className="w-full gradient-primary" disabled={!newBudget.budget || parseInt(newBudget.budget) > currentBalance}>
                    Add Budget Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Balance Warning */}
        {!canCreateBudget && (
          <Card className="border-budget-warning bg-warning-light border">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <div>
                <p className="font-medium text-card-foreground">No available balance</p>
                <p className="text-sm text-muted-foreground">Add income first to start creating budget categories.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Budget Overview</TabsTrigger>
            <TabsTrigger value="info">Budget Information</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Income Sources */}
            {income.length > 0 && (
              <Card className="gradient-card shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-income" /> Income Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {income.map((source) => (
                      <div key={source.id} className="flex items-center justify-between p-3 rounded-lg bg-income/10 border border-income/20">
                        <div>
                          <p className="font-medium text-card-foreground">{(source as any).source || (source as any).name}</p>
                          <p className="text-sm text-muted-foreground">{new Date(source.date).toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-income">₹{source.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-income/5 border border-income/10">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-card-foreground">Total Income</span>
                      <span className="text-xl font-bold text-income">₹{getTotalIncome().toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="gradient-card shadow-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Total Budget</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-card-foreground">₹{totalBudget.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Monthly allocation</p>
                </CardContent>
              </Card>
              <Card className="gradient-card shadow-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Total Spent</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-expense">₹{totalSpent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : 'No budget set'}</p>
                </CardContent>
              </Card>
              <Card className="gradient-card shadow-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Current Balance</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                    ₹{Math.abs(currentBalance).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">{currentBalance >= 0 ? 'Available' : 'Over budget'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Budget Categories with Edit/Delete */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgets.map((category) => {
                const percentage = category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0;
                const status = getBudgetStatus(category.spent, category.allocated);
                const StatusIcon = status.icon;

                return (
                  <Card key={category.id} className="gradient-card shadow-card border-0">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{category.icon}</div>
                          <div>
                            <CardTitle className="text-lg text-card-foreground">{category.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              ₹{category.spent.toLocaleString()} / ₹{category.allocated.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(category)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(category)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <StatusIcon className={`w-5 h-5 text-${status.color}`} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Progress value={Math.min(percentage, 100)} className="h-3" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}% used</span>
                        <span className={`text-sm font-medium ${percentage >= 100 ? 'text-budget-danger' : percentage >= 80 ? 'text-budget-warning' : 'text-budget-good'}`}>
                          {percentage >= 100 ? (
                            <div className="flex items-center"><TrendingDown className="w-4 h-4 mr-1" />Over by ₹{(category.spent - category.allocated).toLocaleString()}</div>
                          ) : (
                            <div>₹{(category.allocated - category.spent).toLocaleString()} remaining</div>
                          )}
                        </span>
                      </div>
                      <div className={`p-3 rounded-lg text-sm ${
                        status.status === 'exceeded' ? 'bg-destructive/10 text-destructive' :
                        status.status === 'warning' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'
                      }`}>
                        {status.status === 'exceeded' && '⚠️ Budget exceeded! Consider reducing spending.'}
                        {status.status === 'warning' && '🔔 Approaching budget limit. Monitor spending.'}
                        {status.status === 'good' && '✅ Great job! Staying within budget.'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Budget Tips */}
            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Target className="w-5 h-5 mr-2 text-accent-vivid" /> Budget Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-card-foreground">Smart Budgeting</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings</li>
                      <li>• Review and adjust budgets monthly</li>
                      <li>• Set alerts when you reach 80% of any budget</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-card-foreground">Recommendations</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Keep emergency fund = 3-6 months expenses</li>
                      <li>• Automate savings before spending</li>
                      <li>• Track every expense for better control</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-accent-vivid" /> Budget Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {budgets.length > 0 ? (
                  <div className="space-y-4">
                    {budgets.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{b.icon}</span>
                          <div>
                            <p className="font-medium text-card-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">Spent: ₹{b.spent.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="font-bold text-card-foreground">₹{b.allocated.toLocaleString()}</p>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex justify-between"><span className="font-medium">Total Allocated</span><span className="font-bold">₹{totalBudget.toLocaleString()}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No budgets created yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Budget Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Budget: {editingBudget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Current Amount</p>
              <p className="text-lg font-bold text-card-foreground">₹{editingBudget?.allocated?.toLocaleString()}</p>
            </div>
            <div>
              <Label>New Amount (₹)</Label>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} min={0} />
              {editingBudget && parseFloat(editAmount) > editingBudget.allocated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Increase of ₹{(parseFloat(editAmount) - editingBudget.allocated).toLocaleString()} will be deducted from balance
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-primary" onClick={handleEditBudget}>Update Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Budget Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Budget: {deletingBudget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground">Are you sure you want to delete this budget category?</p>
            <div className="p-3 rounded-lg bg-income/10 border border-income/20">
              <p className="text-sm text-muted-foreground">Amount to be returned to balance</p>
              <p className="text-lg font-bold text-income">₹{deletingBudget?.allocated?.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteBudget}>Delete Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Budget;
