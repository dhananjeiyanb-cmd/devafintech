
DROP POLICY "Authenticated users can insert leads" ON public.leads;

CREATE POLICY "Users can insert own leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
