import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    
    if (!message || !user_id) {
      throw new Error('Message and user_id are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all user financial data in parallel
    const [transactionsRes, budgetsRes, incomeRes, savingsRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user_id).order('date', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', user_id),
      supabase.from('income').select('*').eq('user_id', user_id),
      supabase.from('savings_goals').select('*').eq('user_id', user_id),
      supabase.from('profiles').select('*').eq('id', user_id).single(),
    ]);

    const transactions = transactionsRes.data || [];
    const budgets = budgetsRes.data || [];
    const income = incomeRes.data || [];
    const savings = savingsRes.data || [];
    const profile = profileRes.data;

    // Calculate analytics
    const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const totalSavingsTarget = savings.reduce((sum, s) => sum + Number(s.target_amount), 0);
    const totalSavingsCurrent = savings.reduce((sum, s) => sum + Number(s.current_amount), 0);
    const totalBudgetAllocated = budgets.reduce((sum, b) => sum + Number(b.allocated), 0);
    const totalBudgetSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);

    // Category-wise spending
    const categorySpending: Record<string, number> = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category || 'General';
      categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(Number(t.amount));
    });

    // Budget overspend analysis
    const overspentBudgets = budgets.filter(b => Number(b.spent) > Number(b.allocated)).map(b => ({
      name: b.name,
      category: b.category,
      allocated: b.allocated,
      spent: b.spent,
      overspendPercent: Math.round(((Number(b.spent) - Number(b.allocated)) / Number(b.allocated)) * 100)
    }));

    // Monthly trend (last 6 months)
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const month = t.date?.substring(0, 7) || 'unknown';
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
      if (t.amount > 0) monthlyData[month].income += Number(t.amount);
      else monthlyData[month].expense += Math.abs(Number(t.amount));
    });

    const systemPrompt = `You are FinPilot, an expert AI financial advisor for Indian families. You analyze personal finance data and provide actionable, personalized advice.

USER PROFILE:
- Name: ${profile?.full_name || 'User'}

FINANCIAL SUMMARY:
- Total Income: ₹${totalIncome.toLocaleString()}
- Total Expenses: ₹${totalExpenses.toLocaleString()}
- Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}%
- Total Budget Allocated: ₹${totalBudgetAllocated.toLocaleString()}
- Total Budget Spent: ₹${totalBudgetSpent.toLocaleString()}
- Budget Utilization: ${totalBudgetAllocated > 0 ? (totalBudgetSpent / totalBudgetAllocated * 100).toFixed(1) : 0}%

SAVINGS GOALS:
${savings.length > 0 ? savings.map(s => `- ${s.title}: ₹${Number(s.current_amount).toLocaleString()} / ₹${Number(s.target_amount).toLocaleString()} (${(Number(s.current_amount)/Number(s.target_amount)*100).toFixed(0)}%) - Priority: ${s.priority}`).join('\n') : 'No savings goals set'}

CATEGORY-WISE SPENDING:
${Object.entries(categorySpending).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `- ${cat}: ₹${amt.toLocaleString()}`).join('\n') || 'No spending data'}

BUDGET HEALTH:
${budgets.map(b => `- ${b.name} (${b.category}): Allocated ₹${Number(b.allocated).toLocaleString()}, Spent ₹${Number(b.spent).toLocaleString()} ${Number(b.spent) > Number(b.allocated) ? '⚠️ OVERSPENT' : '✅'}`).join('\n') || 'No budgets set'}

OVERSPENT CATEGORIES:
${overspentBudgets.length > 0 ? overspentBudgets.map(b => `- ${b.name}: ${b.overspendPercent}% over budget`).join('\n') : 'None - all within budget!'}

MONTHLY TRENDS:
${Object.entries(monthlyData).sort().slice(-6).map(([m, d]) => `- ${m}: Income ₹${d.income.toLocaleString()}, Expense ₹${d.expense.toLocaleString()}`).join('\n') || 'No trend data'}

RECENT TRANSACTIONS (last 10):
${transactions.slice(0, 10).map(t => `- ${t.date}: ${t.description} | ₹${Math.abs(Number(t.amount)).toLocaleString()} (${t.category}) [${t.amount > 0 ? 'Income' : 'Expense'}]`).join('\n') || 'No transactions'}

GUIDELINES FOR ADVICE:
1. Always use ₹ (Indian Rupees) for amounts
2. Recommend Indian investment options: SIP, PPF, NPS, ELSS, FD, RD, Gold ETFs, Sukanya Samriddhi (if applicable)
3. Reference Indian tax benefits under 80C, 80D, HRA, etc.
4. Suggest 50-30-20 or priority-based budgeting rules
5. If medical spending is high, recommend health insurance plans
6. For overspent categories, give specific reduction strategies
7. Be encouraging but honest about financial health
8. Give specific numbers and percentages in analysis
9. Suggest emergency fund of 6 months expenses
10. Recommend diversified portfolio based on risk profile`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      financialSummary: {
        totalIncome,
        totalExpenses,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0',
        overspentCategories: overspentBudgets,
        categorySpending,
        totalTransactions: transactions.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI financial assistant:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
