-- Ensure grants for plans table
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

-- Update RLS policies for plans table
DROP POLICY IF EXISTS "Anyone authenticated views active plans" ON public.plans;
DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;

-- Policy for viewing plans: anyone can see active plans, admins can see all
CREATE POLICY "Anyone can view active plans" 
ON public.plans 
FOR SELECT 
USING (active = true OR (auth.role() = 'authenticated' AND has_role(auth.uid(), 'admin'::app_role)));

-- Policy for managing plans: only admins
CREATE POLICY "Admins manage plans" 
ON public.plans 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
