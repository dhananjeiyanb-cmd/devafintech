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
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenantId)
        .order('created_at', { ascending: false });

      const { data: incomeData } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenantId)
        .order('created_at', { ascending: false });

      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenantId)
        .order('created_at', { ascending: false });

      if (budgetData) setBudgets(budgetData as unknown as BudgetCategory[]);
      if (incomeData) setIncome(incomeData as unknown as IncomeSource[]);
      if (transactionData) setTransactions(transactionData as unknown as Transaction[]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addIncome = async (newIncome: { name: string; amount: number; date: string }) => {
    if (!user || !tenantId) {
      toast.error('User not authenticated or tenant ID not found');
      return;
    }

    try {
      const { data: incomeData } = await supabase
        .from('income')
        .insert([{ 
          source: newIncome.name,
          amount: newIncome.amount,
          date: newIncome.date,
          user_id: user.id,
          tenant_id: tenantId 
        }])
        .select()
        .single();

      if (incomeData) {
        setIncome([incomeData as unknown as IncomeSource, ...income]);
      }

      const { data: transactionData } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          tenant_id: tenantId,
          date: newIncome.date,
          description: `${newIncome.name} Credit`,
          amount: newIncome.amount,
          category: "Income",
          mode: "Bank Transfer",
          status: "completed"
        }])
        .select()
        .single();

      if (transactionData) {
        setTransactions([transactionData as unknown as Transaction, ...transactions]);
      }

      toast.success('Income added successfully!');
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income');
    }
  };

  const addBudget = async (newBudget: { name: string; budget: number; color: string; icon: string }) => {
    if (!user || !tenantId) {
      toast.error('User not authenticated or tenant ID not found');
      return;
    }

    try {
      const { data } = await supabase
        .from('budgets')
        .insert([{ 
          name: newBudget.name,
          allocated: newBudget.budget,
          color: newBudget.color,
          icon: newBudget.icon,
          user_id: user.id, 
          tenant_id: tenantId,
          spent: 0 
        }])
        .select()
        .single();

      if (data) {
        setBudgets([...budgets, data as unknown as BudgetCategory]);
        toast.success('Budget category added successfully!');
      }
    } catch (error) {
      console.error('Error adding budget:', error);
      toast.error('Failed to add budget category');
    }
  };

  const processPayment = async (payment: { amount: number; description: string; category: string; merchant: string }) => {
    if (!user || !tenantId) {
      toast.error('User not authenticated or tenant ID not found');
      return;
    }

    try {
      const { data: transactionData } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          tenant_id: tenantId,
          date: new Date().toISOString().split('T')[0],
          description: `${payment.merchant} - ${payment.description}`,
          amount: -payment.amount,
          category: payment.category,
          mode: "UPI",
          status: "completed"
        }])
        .select()
        .single();

      if (transactionData) {
        setTransactions([transactionData as unknown as Transaction, ...transactions]);
      }

      const budgetToUpdate = budgets.find(b => b.name === payment.category);
      if (budgetToUpdate) {
        const { data: updatedBudget } = await supabase
          .from('budgets')
          .update({ spent: budgetToUpdate.spent + payment.amount })
          .eq('id', budgetToUpdate.id)
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updatedBudget) {
          const updatedBudgets = budgets.map(budget => 
            budget.id === (updatedBudget as any).id ? updatedBudget as unknown as BudgetCategory : budget
          );
          setBudgets(updatedBudgets);
        }
      }

      toast.success('Payment processed successfully!');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  };

  const getTotalBudget = () => {
    return budgets.reduce((sum, category) => sum + category.allocated, 0);
  };

  const getTotalSpent = () => {
    return budgets.reduce((sum, category) => sum + category.spent, 0);
  };

  const getTotalIncome = () => {
    return income.reduce((sum, source) => sum + source.amount, 0);
  };

  const getCurrentBalance = () => {
    return getTotalIncome() - getTotalSpent();
  };

  const getBudgetUsagePercentage = () => {
    const totalBudget = getTotalBudget();
    const totalSpent = getTotalSpent();
    return totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  };

  const getSavingsPercentage = () => {
    const totalIncome = getTotalIncome();
    const totalSpent = getTotalSpent();
    const savings = totalIncome - totalSpent;
    return totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;
  };

  const refreshTransactions = async () => {
    if (!user || !tenantId) return;

    try {
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (transactionData) {
        setTransactions(transactionData as unknown as Transaction[]);
      }
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    }
  };

  const value: BudgetContextType = {
    budgets,
    income,
    transactions,
    setBudgets,
    addIncome,
    addBudget,
    processPayment,
    refreshTransactions,
    getTotalBudget,
    getTotalSpent,
    getTotalIncome,
    getCurrentBalance,
    getBudgetUsagePercentage,
    getSavingsPercentage
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};
