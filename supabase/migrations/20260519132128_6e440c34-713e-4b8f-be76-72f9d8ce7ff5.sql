
CREATE TABLE IF NOT EXISTS public.user_active_session (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_active_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own row select" ON public.user_active_session
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own row insert" ON public.user_active_session
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own row update" ON public.user_active_session
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own row delete" ON public.user_active_session
  FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_active_session;
ALTER TABLE public.user_active_session REPLICA IDENTITY FULL;
