
-- Add missing columns to reminders
ALTER TABLE public.reminders ADD COLUMN description TEXT;
ALTER TABLE public.reminders ADD COLUMN frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.reminders ADD COLUMN category TEXT DEFAULT 'other';
ALTER TABLE public.reminders ADD COLUMN auto_pay BOOLEAN DEFAULT false;
