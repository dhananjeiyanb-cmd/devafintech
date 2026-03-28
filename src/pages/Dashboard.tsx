import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Bell,
  ArrowUpRight, ArrowDownRight, Send, Bot, PieChart as PieChartIcon
} from "lucide-react";
import { useBudget } from "@/contexts/BudgetContext";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import HealthScoreWidget from "@/components/HealthScoreWidget";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Transport: "#1e40af", Shopping: "#ef4444", Bills: "#6b7280",
  Entertainment: "#a855f7", Health: "#22c55e", Savings: "#8b5cf6", Others: "#64748b", General: "#64748b",
};

const Dashboard = () => {
  const { getCurrentBalance, getTotalSpent, getBudgetUsagePercentage, getSavingsPercentage, transactions } = useBudget();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [messages, setMessages] = useState([
    { type: 'bot', content: "Hi! I'm FinPilot, your AI financial assistant. Ask me about your spending!" }
  ]);
  
  const currentBalance = getCurrentBalance();
  const monthlySpent = getTotalSpent();
  const budgetUsed = getBudgetUsagePercentage();
  const savingsProgress = getSavingsPercentage();

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  // Category breakdown for pie chart (expenses only)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category || "Others";
      map[cat] = (map[cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const topCategory = categoryData[0];

  const fetchUpcomingBills = async () => {
    if (!user) return;
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('reminders').select('*').eq('user_id', user.id).eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('due_date', { ascending: true }).limit(3);
      if (error) throw error;
      setUpcomingBills(data || []);
    } catch (error) { console.error('Error fetching upcoming bills:', error); }
  };

  useEffect(() => { fetchUpcomingBills(); }, [user]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    const userMessage = message;
    setMessage("");
    setIsLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Authentication Required", variant: "destructive" }); return; }
      const { data, error } = await supabase.functions.invoke('ai-financial-assistant', {
        body: { message: userMessage, user_id: user.id }
      });
      if (error) throw error;
      setMessages(prev => [...prev, { type: 'bot', content: data.message || "Sorry, I couldn't process that." }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { type: 'bot', content: "Having trouble connecting. Please try again." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Your financial overview at a glance</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-income" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">₹{currentBalance.toLocaleString()}</div>
              <div className="flex items-center text-xs text-income"><ArrowUpRight className="w-3 h-3 mr-1" />Available</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Monthly Spent</CardTitle>
              <CreditCard className="h-4 w-4 text-expense" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">₹{monthlySpent.toLocaleString()}</div>
              <div className="flex items-center text-xs text-expense"><ArrowDownRight className="w-3 h-3 mr-1" />This month</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Top Category</CardTitle>
              <PieChartIcon className="h-4 w-4 text-budget-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{topCategory?.name || "—"}</div>
              <div className="text-xs text-muted-foreground">₹{(topCategory?.value || 0).toLocaleString()} spent</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Savings Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-savings" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{savingsProgress}%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div className="bg-savings rounded-full h-2 transition-all duration-300" style={{ width: `${savingsProgress}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spending Breakdown + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-primary" /> Spending Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No expenses recorded yet</p>
                  <Button className="mt-4 gradient-primary" onClick={() => navigate("/add-expense")}>Add Your First Expense</Button>
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {categoryData.map(e => <Cell key={e.name} fill={CATEGORY_COLORS[e.name] || "#64748b"} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-card-foreground">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")} className="text-primary">View All</Button>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="font-medium text-sm text-card-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date} • {tx.category}</p>
                      </div>
                      <p className={`font-bold ${tx.amount > 0 ? 'text-income' : 'text-expense'}`}>
                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Family Health Score */}
        <HealthScoreWidget />

        {/* FinPilot AI */}
        <Card className="gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center">
              <Bot className="w-6 h-6 mr-2 text-primary" /> FinPilot – AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 overflow-y-auto space-y-3 p-4 bg-muted/20 rounded-lg">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.type === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card text-card-foreground rounded-bl-sm shadow-card'
                  }`}>{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your finances..." className="flex-1" />
              <Button onClick={handleSendMessage} disabled={isLoading} className="gradient-primary shadow-glow" size="icon">
                {isLoading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bills */}
        <Card className="gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center">
              <Bell className="w-5 h-5 mr-2 text-budget-warning" /> Upcoming Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingBills.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No upcoming bills in the next 30 days</p>
            ) : (
              upcomingBills.map((bill: any) => {
                const daysUntilDue = Math.ceil((new Date(bill.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={bill.id} className={`flex items-center justify-between p-3 rounded-lg ${daysUntilDue <= 3 ? 'bg-warning-light' : 'bg-muted'}`}>
                    <div>
                      <p className="font-medium text-card-foreground">{bill.title}</p>
                      <p className="text-sm text-muted-foreground">{daysUntilDue <= 0 ? 'Due today' : daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`}</p>
                    </div>
                    <p className={`font-bold ${daysUntilDue <= 3 ? 'text-warning' : 'text-card-foreground'}`}>₹{bill.amount.toLocaleString()}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
