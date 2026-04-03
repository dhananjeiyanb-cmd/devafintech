import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  icon: string;
  category: string;
}

export interface IncomeSource {
  id: string;
  source: string;
  amount: number;
  date: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  mode: string;
  status: string;
}

interface BudgetContextType {
  budgets: BudgetCategory[];
  income: IncomeSource[];
  transactions: Transaction[];
  setBudgets: (budgets: BudgetCategory[]) => void;
  addIncome: (income: { name: string; amount: number; date: string }) => void;
  addBudget: (budget: { name: string; budget: number; color: string; icon: string }) => void;
  updateBudgetAmount: (budgetId: string, newAmount: number) => Promise<boolean>;
  deleteBudget: (budgetId: string) => Promise<void>;
  processPayment: (payment: { amount: number; description: string; category: string; merchant: string }) => void;
  refreshTransactions: () => Promise<void>;
  getTotalBudget: () => number;
  getTotalSpent: () => number;
  getTotalIncome: () => number;
  getCurrentBalance: () => number;
  getBudgetUsagePercentage: () => number;
  getSavingsPercentage: () => number;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [income, setIncome] = useState<IncomeSource[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTenantIdAndData();
    } else {
      setBudgets([]);
      setIncome([]);
      setTransactions([]);
      setTenantId(null);
    }
  }, [user]);

  const loadTenantIdAndData = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
        await loadData(profile.tenant_id);
      }
    } catch (error) {
      console.error('Error loading tenant ID and data:', error);
    }
  };

  const loadData = async (currentTenantId: string) => {
    if (!user) return;
    try {
      const { data: budgetData } = await supabase.from('budgets').select('*')
        .eq('user_id', user.id).eq('tenant_id', currentTenantId).order('created_at', { ascending: false });
      const { data: incomeData } = await supabase.from('income').select('*')
        .eq('user_id', user.id).eq('tenant_id', currentTenantId).order('created_at', { ascending: false });
      const { data: transactionData } = await supabase.from('transactions').select('*')
        .eq('user_id', user.id).eq('tenant_id', currentTenantId).order('created_at', { ascending: false });

      if (budgetData) {
        setBudgets(budgetData as unknown as BudgetCategory[]);
        // Auto-check for medical overspends and generate leads
        checkMedicalOverspends(budgetData as any[]);
      }
      if (incomeData) setIncome(incomeData as unknown as IncomeSource[]);
      if (transactionData) setTransactions(transactionData as unknown as Transaction[]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkMedicalOverspends = async (budgetData: any[]) => {
    if (!user || !tenantId) return;
    const medicalKeywords = ['medical', 'medicine', 'health', 'hospital', 'pharma'];
    const overspentMedical = budgetData.filter(b => {
      const name = (b.name || '').toLowerCase();
      return medicalKeywords.some(k => name.includes(k)) && b.spent > b.allocated;
    });

    for (const budget of overspentMedical) {
      // Check if lead already exists for this user+category
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('category', 'Medicine');
      
      if (existingLead && existingLead.length > 0) continue;

      const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single();
      const overspendPct = Math.round(((budget.spent - budget.allocated) / budget.allocated) * 100);
      
      await supabase.from('leads').insert([{
        user_id: user.id,
        tenant_id: tenantId,
        category: 'Medicine',
        allocated_amount: budget.allocated,
        spent_amount: budget.spent,
        overspend_percentage: overspendPct,
        lead_status: 'new',
        user_name: profile?.full_name || null,
        user_email: user.email || null,
        user_phone: profile?.phone || null,
      }]);
    }
  };

  const addIncome = async (newIncome: { name: string; amount: number; date: string }) => {
    if (!user || !tenantId) { toast.error('User not authenticated'); return; }
    try {
      const { data: incomeData } = await supabase.from('income')
        .insert([{ source: newIncome.name, amount: newIncome.amount, date: newIncome.date, user_id: user.id, tenant_id: tenantId }])
        .select().single();
      if (incomeData) setIncome([incomeData as unknown as IncomeSource, ...income]);

      const { data: transactionData } = await supabase.from('transactions')
        .insert([{ user_id: user.id, tenant_id: tenantId, date: newIncome.date, description: `${newIncome.name} Credit`, amount: newIncome.amount, category: "Income", mode: "Bank Transfer", status: "completed" }])
        .select().single();
      if (transactionData) setTransactions([transactionData as unknown as Transaction, ...transactions]);
      toast.success('Income added successfully!');
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income');
    }
  };

  const addBudget = async (newBudget: { name: string; budget: number; color: string; icon: string }) => {
    if (!user || !tenantId) { toast.error('User not authenticated'); return; }
    
    // Check current balance
    const balance = getTotalIncome() - getTotalSpent();
    if (balance <= 0) {
      toast.error('Insufficient balance. Add income first before creating a budget.');
      return;
    }
    if (newBudget.budget > balance) {
      toast.error(`Budget amount ₹${newBudget.budget.toLocaleString()} exceeds available balance ₹${Math.round(balance).toLocaleString()}`);
      return;
    }

    try {
      const { data } = await supabase.from('budgets')
        .insert([{ name: newBudget.name, allocated: newBudget.budget, color: newBudget.color, icon: newBudget.icon, user_id: user.id, tenant_id: tenantId, spent: 0 }])
        .select().single();
      if (data) {
        setBudgets([...budgets, data as unknown as BudgetCategory]);
        toast.success('Budget category added successfully!');
      }
    } catch (error) {
      console.error('Error adding budget:', error);
      toast.error('Failed to add budget category');
    }
  };

  const updateBudgetAmount = async (budgetId: string, newAmount: number): Promise<boolean> => {
    if (!user || !tenantId) { toast.error('User not authenticated'); return false; }
    
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return false;

    const increase = newAmount - budget.allocated;
    if (increase > 0) {
      const balance = getTotalIncome() - getTotalSpent();
      const availableForIncrease = balance - budgets.reduce((s, b) => s + b.allocated, 0) + budget.allocated;
      // Simplified: check if increase fits in remaining unallocated balance
      const totalAllocatedOthers = budgets.filter(b => b.id !== budgetId).reduce((s, b) => s + b.allocated, 0);
      const totalIncome = getTotalIncome();
      const totalSpent = getTotalSpent();
      const currentBalance = totalIncome - totalSpent;
      
      if (newAmount > currentBalance - totalAllocatedOthers + budget.allocated) {
        toast.error('Insufficient balance to increase this budget');
        return false;
      }
    }

    try {
      const { error } = await supabase.from('budgets')
        .update({ allocated: newAmount })
        .eq('id', budgetId).eq('user_id', user.id);
      if (error) throw error;
      setBudgets(budgets.map(b => b.id === budgetId ? { ...b, allocated: newAmount } : b));
      toast.success('Budget updated!');
      return true;
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
      return false;
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user || !tenantId) { toast.error('User not authenticated'); return; }
    try {
      const { error } = await supabase.from('budgets')
        .delete().eq('id', budgetId).eq('user_id', user.id);
      if (error) throw error;
      const deleted = budgets.find(b => b.id === budgetId);
      setBudgets(budgets.filter(b => b.id !== budgetId));
      toast.success(`Budget "${deleted?.name}" deleted. ₹${deleted?.allocated.toLocaleString()} returned to balance.`);
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const processPayment = async (payment: { amount: number; description: string; category: string; merchant: string }) => {
    if (!user || !tenantId) { toast.error('User not authenticated'); return; }
    try {
      const { data: transactionData } = await supabase.from('transactions')
        .insert([{ user_id: user.id, tenant_id: tenantId, date: new Date().toISOString().split('T')[0], description: `${payment.merchant} - ${payment.description}`, amount: -payment.amount, category: payment.category, mode: "UPI", status: "completed" }])
        .select().single();
      if (transactionData) setTransactions([transactionData as unknown as Transaction, ...transactions]);

      const budgetToUpdate = budgets.find(b => b.name === payment.category);
      if (budgetToUpdate) {
        const newSpent = budgetToUpdate.spent + payment.amount;
        const { data: updatedBudget } = await supabase.from('budgets')
          .update({ spent: newSpent })
          .eq('id', budgetToUpdate.id).eq('user_id', user.id).eq('tenant_id', tenantId)
          .select().single();
        if (updatedBudget) {
          setBudgets(budgets.map(b => b.id === (updatedBudget as any).id ? updatedBudget as unknown as BudgetCategory : b));
        }

        // Auto-generate lead if medical/health budget exceeded
        const medicalKeywords = ['medical', 'medicine', 'health', 'pharmacy', 'hospital', 'doctor', 'clinic'];
        const isMedical = medicalKeywords.some(k => budgetToUpdate.name.toLowerCase().includes(k));
        if (isMedical && newSpent > budgetToUpdate.allocated) {
          const overspendPct = Math.round(((newSpent - budgetToUpdate.allocated) / budgetToUpdate.allocated) * 100);
          // Fetch user profile for lead info
          const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single();
          await supabase.from('leads').insert([{
            user_id: user.id,
            tenant_id: tenantId,
            category: budgetToUpdate.name,
            allocated_amount: budgetToUpdate.allocated,
            spent_amount: newSpent,
            overspend_percentage: overspendPct,
            lead_status: 'new',
            user_name: profile?.full_name || null,
            user_email: user.email || null,
            user_phone: (profile as any)?.phone || null,
          }]);
        }
      }
      toast.success('Payment processed successfully!');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  };

  const getTotalBudget = () => budgets.reduce((sum, c) => sum + c.allocated, 0);
  const getTotalSpent = () => budgets.reduce((sum, c) => sum + c.spent, 0);
  const getTotalIncome = () => income.reduce((sum, s) => sum + s.amount, 0);
  const getCurrentBalance = () => getTotalIncome() - getTotalSpent();
  const getBudgetUsagePercentage = () => {
    const tb = getTotalBudget(); const ts = getTotalSpent();
    return tb > 0 ? Math.round((ts / tb) * 100) : 0;
  };
  const getSavingsPercentage = () => {
    const ti = getTotalIncome(); const ts = getTotalSpent();
    return ti > 0 ? Math.round(((ti - ts) / ti) * 100) : 0;
  };

  const refreshTransactions = async () => {
    if (!user || !tenantId) return;
    try {
      const { data } = await supabase.from('transactions').select('*')
        .eq('user_id', user.id).eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (data) setTransactions(data as unknown as Transaction[]);
    } catch (error) { console.error('Error refreshing transactions:', error); }
  };

  const value: BudgetContextType = {
    budgets, income, transactions, setBudgets, addIncome, addBudget, updateBudgetAmount, deleteBudget,
    processPayment, refreshTransactions, getTotalBudget, getTotalSpent, getTotalIncome,
    getCurrentBalance, getBudgetUsagePercentage, getSavingsPercentage
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) throw new Error('useBudget must be used within a BudgetProvider');
  return context;
};
