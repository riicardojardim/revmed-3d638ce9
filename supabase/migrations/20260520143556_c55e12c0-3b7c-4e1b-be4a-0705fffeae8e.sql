CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  kind text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  station_id uuid,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ai_usage_created_at ON public.ai_usage_log (created_at DESC);
CREATE INDEX idx_ai_usage_kind ON public.ai_usage_log (kind);
CREATE INDEX idx_ai_usage_user ON public.ai_usage_log (user_id);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai usage"
  ON public.ai_usage_log
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role inserts ai usage"
  ON public.ai_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
