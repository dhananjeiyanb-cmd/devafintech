import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/Layout";
import { Plus, Target, Calendar, TrendingUp, Star, Gift, Trash2, Eye, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  auto_debit: boolean;
  monthly_contribution: number;
  icon: string;
  priority: string;
  status: string;
}

const motivationalQuotes = [
  "Small savings lead to big achievements! 💪",
  "Every rupee saved is a step towards your dreams! ✨",
  "Consistency in saving creates financial freedom! 🎯",
  "Your future self will thank you for saving today! 🙏",
  "Dreams become plans when you save for them! 🌟"
];

// Add Money Dialog Component
const AddMoneyDialog = ({ goalId, goalTitle, onAddMoney }: { goalId: string; goalTitle: string; onAddMoney: (goalId: string, amount: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) {
      onAddMoney(goalId, parsedAmount);
      setAmount("");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gradient-primary" size="sm">
          <Gift className="w-4 h-4 mr-2" />
          Add Money to Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Money to {goalTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="add-amount">Amount to Add (₹)</Label>
            <Input
              id="add-amount"
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex space-x-4">
            <Button onClick={handleSave} className="gradient-primary flex-1">
              Add Money
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Savings = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    target_amount: "",
    target_date: "",
    monthly_contribution: "",
    icon: "🎯"
  });
  const [currentQuote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  // Calculate totals from database goals

  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalSavedAmount = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalMonthlyContribution = goals.filter(g => g.auto_debit).reduce((sum, goal) => sum + goal.monthly_contribution, 0);

  // Fetch savings goals from database
  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-budget-danger bg-destructive/10';
      case 'medium': return 'text-budget-warning bg-warning-light';
      case 'low': return 'text-budget-good bg-success-light';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const today = new Date();
    const target = new Date(deadline);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day left';
    if (diffDays < 30) return `${diffDays} days left`;
    
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month left' : `${months} months left`;
  };

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.target_amount || !user) return;
    
    try {
      // Get user profile to get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const goalData = {
        title: newGoal.title,
        target_amount: parseFloat(newGoal.target_amount),
        target_date: newGoal.target_date || null,
        monthly_contribution: parseFloat(newGoal.monthly_contribution) || 0,
        icon: newGoal.icon,
        priority: 'medium',
        status: 'active',
        current_amount: 0,
        auto_debit: false,
        user_id: user.id,
        tenant_id: profile.tenant_id
      };

      const { data, error } = await supabase
        .from('savings_goals')
        .insert([goalData])
        .select()
        .single();

      if (error) throw error;

      setGoals([data, ...goals]);
      setNewGoal({ title: "", target_amount: "", target_date: "", monthly_contribution: "", icon: "🎯" });
      setIsDialogOpen(false);
      toast.success('Savings goal created successfully!');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create savings goal');
    }
  };

  const toggleAutoDebit = async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const { error } = await supabase
        .from('savings_goals')
        .update({ auto_debit: !goal.auto_debit })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.map(goal => 
        goal.id === goalId 
          ? { ...goal, auto_debit: !goal.auto_debit }
          : goal
      ));
      
      toast.success(`Auto-debit ${!goal.auto_debit ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating auto-debit:', error);
      toast.error('Failed to update auto-debit setting');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.filter(goal => goal.id !== goalId));
      toast.success('Savings goal deleted successfully');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete savings goal');
    }
  };

  const handleAddMoney = async (goalId: string, amount: number) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const newCurrentAmount = goal.current_amount + amount;

      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.map(g => 
        g.id === goalId 
          ? { ...g, current_amount: newCurrentAmount }
          : g
      ));
      
      toast.success(`₹${amount.toLocaleString()} added to ${goal.title}!`);
    } catch (error) {
      console.error('Error adding money to goal:', error);
      toast.error('Failed to add money to goal');
    }
  };

  const handleViewHistory = (goalId: string, goalTitle: string) => {
    // Navigate to transactions page filtered by this goal
    // For now showing filtered view in dialog
    toast.info(`Viewing transaction history for "${goalTitle}"`);
    // TODO: Implement actual transaction history view
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Savings Goals</h1>
            <p className="text-muted-foreground">Track your progress towards financial milestones</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Savings Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goal-name">Goal Name</Label>
                  <Input
                    id="goal-name"
                    placeholder="e.g., Buy a Car"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="target-amount">Target Amount (₹)</Label>
                  <Input
                    id="target-amount"
                    type="number"
                    placeholder="50000"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Target Date</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="monthly-contribution">Monthly Contribution (₹)</Label>
                  <Input
                    id="monthly-contribution"
                    type="number"
                    placeholder="3000"
                    value={newGoal.monthly_contribution}
                    onChange={(e) => setNewGoal({ ...newGoal, monthly_contribution: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddGoal} className="w-full gradient-primary">
                  Create Savings Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Motivational Quote */}
        <Card className="gradient-purple shadow-glow border-0">
          <CardContent className="p-6 text-center">
            <Star className="w-8 h-8 text-accent-vivid mx-auto mb-3" />
            <p className="text-lg font-medium text-card-foreground">{currentQuote}</p>
          </CardContent>
        </Card>

        {/* Savings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">₹{totalTargetAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{goals.length} active goals</p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-savings">₹{totalSavedAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {((totalSavedAmount / totalTargetAmount) * 100).toFixed(1)}% of total target
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Monthly Auto-Debit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-vivid">₹{totalMonthlyContribution.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Automated savings</p>
            </CardContent>
          </Card>
        </div>

        {/* Savings Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">Loading your savings goals...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No savings goals yet. Create your first goal to get started!</p>
            </div>
          ) : (
            goals.map((goal) => {
              const percentage = (goal.current_amount / goal.target_amount) * 100;
              const remainingAmount = goal.target_amount - goal.current_amount;
              const timeRemaining = goal.target_date ? getTimeRemaining(goal.target_date) : 'No deadline set';

              return (
                <Card key={goal.id} className="gradient-card shadow-card border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">{goal.icon}</div>
                        <div>
                          <CardTitle className="text-lg text-card-foreground">{goal.title}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(goal.priority)}`}>
                              {goal.priority} priority
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {timeRemaining}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(goal.id, goal.title)}
                          className="text-muted-foreground hover:text-accent-vivid"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center">
                                <AlertCircle className="w-5 h-5 text-destructive mr-2" />
                                Delete Savings Goal
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{goal.title}"? This action cannot be undone and all progress will be lost.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete Goal
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-card-foreground">
                          ₹{goal.current_amount.toLocaleString()} / ₹{goal.target_amount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{percentage.toFixed(1)}% completed</span>
                        <span className="text-muted-foreground">₹{remainingAmount.toLocaleString()} remaining</span>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-card-foreground">Auto-debit monthly savings</span>
                        <Switch
                          checked={goal.auto_debit}
                          onCheckedChange={() => toggleAutoDebit(goal.id)}
                        />
                      </div>
                      {goal.auto_debit && (
                        <div className="text-xs text-muted-foreground">
                          ₹{goal.monthly_contribution.toLocaleString()} will be automatically saved each month
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-lg font-bold text-savings">
                          ₹{goal.monthly_contribution.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Monthly target</div>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-lg font-bold text-accent-vivid">
                          {goal.monthly_contribution > 0 ? Math.ceil(remainingAmount / goal.monthly_contribution) : '∞'}
                        </div>
                        <div className="text-xs text-muted-foreground">Months to go</div>
                      </div>
                    </div>

                    <AddMoneyDialog goalId={goal.id} goalTitle={goal.title} onAddMoney={handleAddMoney} />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Savings Tips */}
        <Card className="gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-savings" />
              Smart Savings Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-card-foreground">Automate Your Success</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Set up automatic transfers on salary day</li>
                  <li>• Use the 24-hour rule before making non-essential purchases</li>
                  <li>• Round up purchases and save the change</li>
                  <li>• Save windfalls and bonuses immediately</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-card-foreground">Goal Optimization</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Break large goals into smaller milestones</li>
                  <li>• Prioritize emergency funds over other goals</li>
                  <li>• Review and adjust goals quarterly</li>
                  <li>• Celebrate when you reach milestones</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Savings;