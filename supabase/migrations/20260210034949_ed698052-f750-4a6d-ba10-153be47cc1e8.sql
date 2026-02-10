
-- Add missing columns to savings_goals
ALTER TABLE public.savings_goals ADD COLUMN target_date TEXT;
ALTER TABLE public.savings_goals ADD COLUMN auto_debit BOOLEAN DEFAULT false;
ALTER TABLE public.savings_goals ADD COLUMN monthly_contribution NUMERIC DEFAULT 0;
ALTER TABLE public.savings_goals ADD COLUMN icon TEXT DEFAULT '🎯';
ALTER TABLE public.savings_goals ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE public.savings_goals ADD COLUMN status TEXT DEFAULT 'active';

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);
