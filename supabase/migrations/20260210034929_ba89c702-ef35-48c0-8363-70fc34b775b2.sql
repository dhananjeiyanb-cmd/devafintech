
-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- Add missing columns to budgets table
ALTER TABLE public.budgets ADD COLUMN color TEXT NOT NULL DEFAULT '#3b82f6';
ALTER TABLE public.budgets ADD COLUMN icon TEXT NOT NULL DEFAULT '💰';

-- Add date column to income table  
ALTER TABLE public.income ADD COLUMN date TEXT NOT NULL DEFAULT '';
