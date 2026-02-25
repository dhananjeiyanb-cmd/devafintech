import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBudget } from "@/contexts/BudgetContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const expenseCategories = [
  { value: "Food", icon: "🍕", color: "hsl(38, 92%, 50%)" },
  { value: "Transport", icon: "🚗", color: "hsl(215, 84%, 25%)" },
  { value: "Shopping", icon: "🛍️", color: "hsl(0, 84%, 60%)" },
  { value: "Bills", icon: "📄", color: "hsl(215, 16%, 46%)" },
  { value: "Entertainment", icon: "🎬", color: "hsl(270, 95%, 75%)" },
  { value: "Health", icon: "🏥", color: "hsl(142, 76%, 36%)" },
  { value: "Others", icon: "📦", color: "hsl(210, 40%, 60%)" },
];

const paymentMethods = ["UPI", "Card", "Cash", "Bank Transfer", "Net Banking"];

const AddExpense = () => {
  const { user } = useAuth();
  const { refreshTransactions } = useBudget();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!amount || !category || !paymentMethod || !description) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) {
        toast.error("Profile not found");
        return;
      }

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        tenant_id: profile.tenant_id,
        amount: -Math.abs(parseFloat(amount)),
        date: format(date, "yyyy-MM-dd"),
        description: notes ? `${description} - ${notes}` : description,
        category,
        mode: paymentMethod,
        status: "completed",
      });

      if (error) throw error;

      await refreshTransactions();
      toast.success("Expense recorded successfully!");
      
      // Reset form
      setAmount("");
      setCategory("");
      setPaymentMethod("");
      setDescription("");
      setNotes("");
      setDate(new Date());
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Expense</h1>
          <p className="text-muted-foreground">Record your daily spending</p>
        </div>

        <Card className="gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              New Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Amount (₹) *</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl font-bold h-14"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Category *</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {expenseCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                        category === cat.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span>{cat.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Payment Method *</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Description *</label>
                <Input
                  placeholder="e.g., Lunch at cafe"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground">Notes (optional)</label>
                <Textarea
                  placeholder="Any additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 gradient-primary shadow-glow" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Add Expense"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/transactions")}>
                  View All
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AddExpense;
