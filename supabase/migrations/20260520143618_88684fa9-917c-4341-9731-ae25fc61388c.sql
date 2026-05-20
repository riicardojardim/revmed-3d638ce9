DROP POLICY IF EXISTS "Service role inserts ai usage" ON public.ai_usage_log;
CREATE POLICY "Only admins client insert ai usage"
  ON public.ai_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
