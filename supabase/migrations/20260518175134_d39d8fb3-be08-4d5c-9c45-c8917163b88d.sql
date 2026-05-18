CREATE POLICY "Users delete their own attempts"
ON public.attempts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);