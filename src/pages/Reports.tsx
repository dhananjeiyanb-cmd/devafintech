import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { BarChart3, TrendingUp, PieChart as PieChartIcon, DollarSign } from "lucide-react";
import { useBudget } from "@/contexts/BudgetContext";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b",
  Transport: "#1e40af",
  Shopping: "#ef4444",
  Bills: "#6b7280",
  Entertainment: "#a855f7",
  Health: "#22c55e",
  Income: "#16a34a",
  Savings: "#8b5cf6",
  Others: "#64748b",
  General: "#64748b",
};

const Reports = () => {
  const { transactions } = useBudget();
  const [period, setPeriod] = useState("thisMonth");

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      if (t.amount >= 0) return false; // only expenses
      const d = new Date(t.date);
      if (period === "thisMonth") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === "last3Months") {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return d >= threeMonthsAgo;
      }
      if (period === "thisYear") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, period]);

  // Category-wise spending for pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      const cat = t.category || "Others";
      map[cat] = (map[cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Monthly comparison for bar chart
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + Math.abs(t.amount);
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        total: Math.round(total),
      }));
  }, [transactions]);

  // Daily trends for line chart
  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      map[t.date] = (map[t.date] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, total]) => ({
        date: new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        total: Math.round(total),
      }));
  }, [filteredTransactions]);

  const totalSpending = filteredTransactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const topCategory = categoryData[0];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Visualize your spending patterns</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="last3Months">Last 3 Months</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-expense" /> Total Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-expense">₹{Math.round(totalSpending).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-budget-warning" /> Top Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-card-foreground">{topCategory?.name || "—"}</p>
              <p className="text-sm text-muted-foreground">₹{(topCategory?.value || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-card-foreground">{filteredTransactions.length}</p>
              <p className="text-sm text-muted-foreground">expense entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-primary" /> Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No expense data yet</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#64748b"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Monthly Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No expense data yet</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                      <Bar dataKey="total" fill="hsl(215, 84%, 25%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Chart */}
        <Card className="gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Daily Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No expense data yet</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Line type="monotone" dataKey="total" stroke="hsl(178, 90%, 35%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
